import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { getEnv } from '../config/env';

// Bucket compartido a proposito con el hub y con el modulo ambiental: las
// fotos y actas migradas apuntan a keys de ese bucket, y usar uno nuevo
// obligaria a reescribir URLs viejas. Rotar sus credenciales o borrarlo rompe
// los tres modulos.

// Extension fija por tipo de contenido ya validado por magic bytes en el
// controller. No se deriva del nombre que manda el cliente: un JPEG real
// subido como "evil.html" o "foo.svg" terminaria guardado con esa extension
// en un bucket compartido y servido por url publica, que es exactamente el
// tipo de objeto que despues alguien sirve con el content-type equivocado.
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string | null;

  constructor() {
    const env = getEnv();
    this.bucket = env.R2_BUCKET_NAME ?? '';
    this.publicUrl = env.R2_PUBLIC_URL ?? null;

    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !this.bucket) {
      this.logger.warn('R2 sin configurar: la subida de archivos va a fallar.');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  // contentType, cuando llega, manda sobre la extension del nombre original:
  // es el tipo que ya paso la validacion de firma binaria. El fallback al
  // nombre original solo cubre el caso sin contentType (compatibilidad con
  // el test del servicio, que llama a buildKey directo).
  private buildKey(originalName: string, carpeta: string, contentType?: string): string {
    const ext = (contentType && EXTENSION_BY_CONTENT_TYPE[contentType])
      ?? path.extname(originalName).toLowerCase();
    return `${carpeta}/${randomUUID()}${ext}`;
  }

  private buildUrl(key: string): string | null {
    return this.publicUrl ? `${this.publicUrl.replace(/\/$/, '')}/${key}` : null;
  }

  // Sube un buffer ya validado por el controller (mimetype, tamano, firma).
  // contentType es el tipo real detectado por magic bytes, no el que reporta
  // el cliente: se usa tanto para la extension de la key como para el
  // ContentType que R2 le va a devolver al navegador. Sin este dato, R2 sirve
  // el objeto como application/octet-stream y el navegador lo descarga en
  // vez de mostrarlo.
  // Devuelve la key generada y la url publica cuando hay R2_PUBLIC_URL
  // configurado; si no, el llamador debe pedir una url firmada aparte.
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    carpeta: string,
    contentType?: string,
  ): Promise<{ key: string; url: string | null }> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('El archivo esta vacio');
    }

    const key = this.buildKey(originalName, carpeta, contentType);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      this.logger.error(`Error al subir archivo a R2: ${key}`);
      throw new BadRequestException('No se pudo subir el archivo');
    }

    return { key, url: this.buildUrl(key) };
  }

  // Url firmada con 7 dias de expiracion, para cuando no hay dominio publico
  // configurado sobre el bucket.
  async getSignedUrlFor(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.s3, command, { expiresIn: 7 * 24 * 3600 });
    } catch (error) {
      this.logger.error(`Error al firmar url para: ${key}`);
      throw new BadRequestException('No se pudo generar la url del archivo');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logger.error(`Error al eliminar archivo de R2: ${key}`);
      throw new BadRequestException('No se pudo eliminar el archivo');
    }
  }

  getPublicUrl(): string | null {
    return this.publicUrl;
  }
}
