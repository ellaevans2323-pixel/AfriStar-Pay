import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarModule } from './stellar/stellar.module';
import { RemittanceModule } from './remittance/remittance.module';
import { AnchorModule } from './anchor/anchor.module';
import { TxStatusGateway } from './gateway/tx-status.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StellarModule,
    RemittanceModule,
    AnchorModule,
  ],
  providers: [TxStatusGateway],
})
export class AppModule {}
