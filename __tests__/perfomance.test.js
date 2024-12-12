import { describe, it, beforeEach, afterEach, expect } from "vitest";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { _FKS_, _FKS_MODEL_ } from "../models.js";
import { InitMongoModels, MongoModel } from "../mongoClass.js";

const LOG_FILE = path.join(__dirname, "performance_test.log");

// Utility function for logging
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(logMessage.trim());
};

const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

describe("Mongo instance creation", () => {
    let mongoD = undefined;

    beforeEach(async () => {
        await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

        const collections = await mongoose.connection.db.listCollections().toArray();
        const dropPromises = collections.map((collection) =>
            mongoose.connection.db.dropCollection(collection.name)
        );

        await Promise.all(dropPromises);

        for (let model in mongoose.models) {
            delete mongoose.models[model];
        }

        if (mongoD) {
            for (const value of Object.values(mongoD.models)) {
                await value.deleteMany({});
                await value.collection.drop();
            }
        }

        mongoD = new InitMongoModels();
    }, 0);

    afterEach(async () => {
        vi.restoreAllMocks();
        await mongoose.connection.close();
    });

    it("test 10k", async () => {
        const startTime = performance.now();  // Start timing

        for (let i = 0; i < 10000; i++) {
            await mongoose.model(`RelatedModel-${i}`, new mongoose.Schema({
                title: { type: String, required: true },
            }));
            await mongoose.model(`TestModel-${i}`, new mongoose.Schema({
                name: { type: String, required: true },
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: `RelatedModel-${i}`,
                    required: true,
                },
            }));
        }

        const endTime = performance.now();  // End timing
        const timeTaken = endTime - startTime;  // Calculate the time taken

        expect(Object.keys(mongoose.models)).toHaveLength(20000);

        logToFile(`***********1K*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });

    it("test __FKS_MODEL__ 10k", async () => {
        const startTime = performance.now();  // Start timing

        for (let i = 0; i < 10000; i++) {
            await mongoD.MongoModel(`RelatedModel-${i}`, new mongoose.Schema({
                title: { type: String, required: true },
            }));
            await mongoD.MongoModel(`TestModel-${i}`, new mongoose.Schema({
                name: { type: String, required: true },
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: `RelatedModel-${i}`,
                    linked: true,
                    required: true,
                },
            }));
        }

        const endTime = performance.now();  // End timing
        const timeTaken = endTime - startTime;  // Calculate the time taken

        expect(Object.keys(mongoose.models)).toHaveLength(20000);

        logToFile(`***********__FKS_MODEL__ 1K*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });
}, 0);
