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

    const collections = await mongoose.connection.db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        console.log(collection.name);
        await mongoose.connection.db.dropCollection(collection.name)
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
