import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlersModule } from './crawlers/crawlers.module';
import { ProductsModule } from './products/products.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    ProductsModule,
    CrawlersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
