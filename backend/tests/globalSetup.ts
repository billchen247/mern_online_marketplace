import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export async function setup() {
  mongod = await MongoMemoryServer.create({ binary: { version: process.env.MONGOMS_VERSION ?? '7.0.24' } });
  process.env.TEST_MONGO_URI = mongod.getUri();
}
export async function teardown() {
  await mongod?.stop();
}
