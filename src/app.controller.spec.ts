import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('responde ok en health', async () => {
    const modulo = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    expect(modulo.get(AppController).health()).toEqual({ status: 'ok' });
  });
});
