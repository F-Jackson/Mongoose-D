import { describe, it, beforeEach, afterEach, expect, beforeAll } from "vitest";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { InitMongoModels } from "../mongoClass.js";

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

    beforeAll(async () => {
        await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    }, 0);

    beforeEach(async () => {
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

        logToFile(`***********10K*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });

    it("test 10k NESTED", async () => {
        const startTime = performance.now();  // Start timing

        for (let i = 0; i < 10000; i++) {
            await mongoose.model(`TestModel-${i}`, new mongoose.Schema({
                name: { type: String, required: true },
                nested: {
                    name0: [String],
                    nested1: {
                        name1: [String],
                        nested3: {
                            name2: [String],
                            nested5: {
                                name3: [String],
                                nested6: {
                                    name4: [String],
                                    nested7: {
                                        name5: [String],
                                        nested8: {
                                            name6: [String],
                                            nested9: {
                                                name7: [String],
                                                related: {
                                                    type: mongoose.Schema.Types.ObjectId,
                                                    ref: `RelatedModel-${i}`,
                                                    required: true,
                                                }
                                            }
                                        }
                                    }
                                } 
                            }
                        }
                    }
                },
            }));
        }

        const endTime = performance.now();  // End timing
        const timeTaken = endTime - startTime;  // Calculate the time taken

        expect(Object.keys(mongoose.models)).toHaveLength(10000);

        logToFile(`***********10K NESTED*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });

    it("test __FKS_MODEL__ 10k NESTED", async () => {
        const startTime = performance.now();  // Start timing
        console.log("started");

        for (let i = 0; i < 10000; i++) {
            console.log("start", i);
            const schema = mongoD.NewSchema({
                name: { type: String, required: true },
                nested: {
                    name0: [String],
                    nested1: {
                        name1: [String],
                        nested3: {
                            name2: [String],
                            nested5: {
                                name3: [String],
                                nested6: {
                                    name4: [String],
                                    nested7: {
                                        name5: [String],
                                        nested8: {
                                            name6: [String],
                                            nested9: {
                                                name7: [String],
                                                related: {
                                                    type: mongoose.Schema.Types.ObjectId,
                                                    ref: `RelatedModel-${i}`,
                                                    required: true,
                                                }
                                            }
                                        }
                                    }
                                } 
                            }
                        }
                    }
                },
            });
            //console.log("Schema", i);
            await mongoD.MongoModel(`TestModel-${i}`, schema);
        }

        const endTime = performance.now();  // End timing
        const timeTaken = endTime - startTime;  // Calculate the time taken

        expect(Object.keys(mongoose.models)).toHaveLength(10000);

        logToFile(`***********FKS 10K NESTED*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });

    it("test __FKS_MODEL__ 10k", async () => {
        const startTime = performance.now();  // Start timing

        for (let i = 0; i < 10000; i++) {
            await mongoD.MongoModel(`RelatedModel-${i}`, mongoD.NewSchema({
                title: { type: String, required: true },
            }));
            await mongoD.MongoModel(`TestModel-${i}`, mongoD.NewSchema({
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

        logToFile(`***********FKS 10K*********** ${timeTaken.toFixed(2)} ms`);  // Log time taken
    });
}, 0);
