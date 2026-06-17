import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import { RemittanceService } from './remittance.service';

export class RemitDto {
  senderKeypair: string;
  destAddress: string;
  sendAsset: { code: string; issuer?: string };
  destAsset: { code: string; issuer?: string };
  amount: string;
}

@Controller()
export class RemittanceController {
  constructor(private service: RemittanceService) {}

  @Post('remit')
  @HttpCode(200)
  remit(@Body() dto: RemitDto) {
    return this.service.remit(dto);
  }

  @Get('corridors')
  corridors() {
    return this.service.getCorridors();
  }
}
