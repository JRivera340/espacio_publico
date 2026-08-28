import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

// Limite parejo para fotos y actas: sin uno, cualquier sesion valida puede
// llenar el bucket compartido con el hub y con ambiental.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// El mimetype que reporta el cliente es solo el minimo: se puede falsificar
// desde el propio navegador. La firma binaria (magic bytes) es la fuente de
// verdad del tipo real, y ese tipo -no el nombre del archivo ni el mimetype
// declarado- es lo que se le pasa al servicio para armar la key y el
// ContentType que R2 le devuelve al navegador.
function detectarTipoDeImagen(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 4) return null;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  // WEBP: 'RIFF'....'WEBP'
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function detectarTipoDePdf(buffer: Buffer): 'application/pdf' | null {
  return buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-' ? 'application/pdf' : null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadFoto(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporciono ningun archivo');
    }
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('La foto debe ser una imagen JPG, PNG o WebP');
    }
    const tipoReal = detectarTipoDeImagen(file.buffer);
    if (!tipoReal) {
      throw new BadRequestException('El contenido del archivo no corresponde a una imagen valida');
    }

    const { key, url } = await this.filesService.uploadFile(file.buffer, file.originalname, 'photos', tipoReal);
    return { key, url };
  }

  @Post('upload-acta')
  @Roles(Role.GESTOR_ESPACIO_PUBLICO, Role.VALIDADOR_ESPACIO_PUBLICO, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadActa(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporciono ningun archivo');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('El acta debe ser un archivo PDF');
    }
    const tipoReal = detectarTipoDePdf(file.buffer);
    if (!tipoReal) {
      throw new BadRequestException('El contenido del archivo no corresponde a un PDF valido');
    }

    const { key, url } = await this.filesService.uploadFile(file.buffer, file.originalname, 'actas', tipoReal);
    return { key, url };
  }
}
