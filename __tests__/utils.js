import mongoose from "mongoose";
import { InitMongoModels } from "../mongoClass.js";
import { MongoMemoryServer } from 'mongodb-memory-server';


export const cleanDb = async () => {
    mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '4.4.18', // Versão que não exige libcrypto.so.1.1
        },
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const collections = await mongoose.connection.db.listCollections().toArray();
    const dropPromises = collections.map((collection) =>
        mongoose.connection.db.dropCollection(collection.name)
    );
    await Promise.all(dropPromises);

    for (let model in mongoose.models) {
        delete mongoose.models[model];
    }

    return [new InitMongoModels(), mongoServer];
};

export const disconnectDb = async (mongoServer, vi) => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
};
