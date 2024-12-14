import mongoose from "mongoose";
import { InitMongoModels } from "../mongoClass.js";
import { MongoMemoryServer } from 'mongodb-memory-server';


export const cleanDb = async (vi) => {
    vi.restoreAllMocks();
    await mongoose.disconnect();

    const mongoServer = await MongoMemoryServer.create({
        binary: {
            version: '4.4.18',
        },
    });
    const uri = mongoServer.getUri();
    const client = await mongoose.connect(uri, {
        //useNewUrlParser: true,
        //useUnifiedTopology: true,
    });

    const db = client.connection.db;
    const collections = await db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        await db.dropCollection(collection.name)
    });
    await Promise.all(dropPromises);

    for (let model in mongoose.models) {
        delete mongoose.models[model];
    }

    return [new InitMongoModels(), mongoServer, client];
};

export const disconnectDb = async (mongoServer) => {
    if (mongoServer) await mongoServer.stop();
};
