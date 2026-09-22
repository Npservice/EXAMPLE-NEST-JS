import { createKeyv } from '@keyv/redis';
import type { ConfigService } from '@nestjs/config';

export const buildCacheConfig = (config: ConfigService) => {
  const host = config.get<string>('REDIS_HOST', 'localhost');
  const port = config.get<number>('REDIS_PORT', 6379);
  const password = config.get<string>('REDIS_PASSWORD', '');
  const auth = password ? `:${password}@` : '';

  return {
    stores: [createKeyv(`redis://${auth}${host}:${port}`)],
    ttl: config.get<number>('CACHE_TTL', 60) * 1000,
  };
};
