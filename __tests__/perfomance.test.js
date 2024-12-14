import { describe, it, beforeEach, afterEach, expect } from "vitest";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { cleanDb } from "./utils.js";

const LOG_FILE = path.join(__dirname, "performance_test.log");

// Utility function for logging
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(logMessage.trim());
};

describe("Mongo instance creation", () => {
    let mongoD = undefined;
    let mongoServer;

    beforeEach(async () => {
        [mongoD, mongoServer] = await cleanDb(mongoServer, mongoD);
    }, 0);

    afterEach(async () => {
        await disconnectDb(mongoServer, vi);
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
        const startTime = performance.now();

        for (let i = 0; i < 10000; i++) {
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
