import { Module } from '@nestjs/common';
import { StellarModule } from '../stellar/stellar.module';
import { RemittanceService } from './remittance.service';
import { RemittanceController } from './remittance.controller';

@Module({
  imports: [StellarModule],
  providers: [RemittanceService],
  controllers: [RemittanceController],
})
export class RemittanceModule {}
