import { Controller, Post, Get, Body, Query, Param, HttpCode } from '@nestjs/common';
import { AnchorService } from './anchor.service';

@Controller('anchor')
export class AnchorController {
  constructor(private service: AnchorService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: any) {
    return this.service.register(dto);
  }

  // SEP-6 deposit
  @Get('deposit')
  deposit(@Query() params: any) {
    return this.service.deposit(params);
  }

  // SEP-6 withdraw
  @Get('withdraw')
  withdraw(@Query() params: any) {
    return this.service.withdraw(params);
  }

  // SEP-6 transaction status
  @Get('transaction/:id')
  getTransaction(@Param('id') id: string) {
    return this.service.getTransaction(id);
  }
}
