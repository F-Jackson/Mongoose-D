import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_MODEL_, _FKS_ } from "../models.js";
import { InitMongoModels } from "../mongoClass.js";
import { ForeignKeyProcessor } from "../generateModel.js";

const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

describe("Mongo model creation", () => {
    let testSchema = undefined;

    let relatedSchema = undefined;

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
        relatedSchema = new mongoD.Schema({
            title: { type: String, required: true },
        });
        testSchema = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await mongoose.connection.close();
    });

    it("should create a model and process foreign keys", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);

        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: "related",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should throw error if model with same name exists", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);

        await expect(() => mongoD.MongoModel("TestModel", relatedSchema)).rejects.toThrow(
            "Model already exists"
        );

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("TestModel");

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: "related",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should handle models with no foreign keys", async () => {
        const simpleSchema = new mongoD.Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await mongoD.MongoModel("SimpleModel", simpleSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });

    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = new mongoD.Schema({
            name: { type: String, required: true },
            related1: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
            related2: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: false,
            },
        });

        const MultiFKModel = await mongoD.MongoModel("MultiFKModel", multiFKSchema);

        expect(Object.entries(MultiFKModel._FKS)).toHaveLength(1);
        expect(MultiFKModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: "related1",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                },
                {
                    path: "related2",
                    required: false,
                    immutable: false,
                    unique: false,
                    array: false,
                },
            ]
        });
    });

    it("should handle deletion of foreign key metadata when model is removed", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);

        await TestModel.collection.drop();

        expect(Object.entries(mongoD.models)).toHaveLength(0);
    });

    it("should process deeply nested foreign keys", async () => {
        const nestedSchema = new mongoD.Schema({
            nestedField: {
                subField: {
                    type: mongoD.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    unique: true,
                    immutable: true
                },
                po: String,
                ll: {
                    io: String,
                    h: String
                }
            },
            nestedField2: {
                po2: {
                    subField: {
                        type: [mongoD.Schema.Types.ObjectId],
                        ref: "RelatedModel",
                    },
                    arrayTest: [{ type: mongoD.Schema.Types.ObjectId, ref: "RelatedModel", required: true }]
                }
            },
            lo: [String]
        });

        const NestedModel = await mongoD.MongoModel("NestedModel", nestedSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("NestedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(Object.entries(mongoD.relations["RelatedModel"])).toHaveLength(1);
        expect(mongoD.relations["RelatedModel"]).toMatchObject(["NestedModel"]);

        expect(Object.entries(NestedModel._FKS)).toHaveLength(1);
        expect(Object.entries(NestedModel._FKS["RelatedModel"])).toHaveLength(2);
        expect(NestedModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: "nestedField.subField",
                    required: true,
                    immutable: true,
                    unique: true,
                    array: false,
                },
                {
                    path: "nestedField2.po2.subField",
                    required: false,
                    immutable: false,
                    unique: false,
                    array: true,
                },
            ]
        });
    });

    it("should handle optional foreign keys", async () => {
        const optionalSchema = new mongoD.Schema({
            optionalField: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                _linked: false,
                required: false,
            },
        });

        const OptionalModel = await mongoD.MongoModel("OptionalModel", optionalSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("OptionalModel");

        expect(OptionalModel).not.toHaveProperty("_FKS");
    });

    it("should process foreign keys when multiple models reference the same model", async () => {
        const anotherTestSchema = new mongoD.Schema({
            anotherName: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });

        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);
        const AnotherTestModel = await mongoD.MongoModel("AnotherTestModel", anotherTestSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(3);
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(mongoD.relations["RelatedModel"]).toMatchObject(["TestModel", "AnotherTestModel"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");
    });

    it("should correctly delete a foreign key model and not affect other models", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);
        const AnotherTestModel = await mongoD.MongoModel("AnotherTestModell", testSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(3);
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(mongoD.relations["RelatedModel"]).toMatchObject(["TestModel", "AnotherTestModell"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");

        await RelatedModel.collection.drop();

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(TestModel).not.toHaveProperty("_FKS");
        expect(AnotherTestModel).not.toHaveProperty("_FKS");

        expect(Object.entries(mongoD.relations)).toHaveLength(0);
    });

    it("should handle circular references", async () => {
        const circularSchemaA = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelB",
                required: true,
            },
        });
    
        const circularSchemaB = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelA",
                required: true,
            },
        });
    
        const ModelA = await mongoD.MongoModel("ModelA", circularSchemaA);
        const ModelB = await mongoD.MongoModel("ModelB", circularSchemaB);
    
        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(Object.entries(mongoD.relations)).toHaveLength(2);

        expect(mongoD.relations["ModelA"]).toMatchObject(["ModelB"]);
        expect(mongoD.relations["ModelB"]).toMatchObject(["ModelA"]);

        expect(Object.entries(ModelA._FKS)).toHaveLength(1);
        expect(ModelA._FKS).toMatchObject({
            "ModelB": [
                {
                    path: "related",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false
                },
            ]
        });

        expect(Object.entries(ModelB._FKS)).toHaveLength(1);
        expect(ModelB._FKS).toMatchObject({
            "ModelA": [
                {
                    path: "related",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false
                },
            ]
        });
    });

    it("should error if not given ref in foreign key", async () => {
        const schemaWithObjectIdFK = new mongoD.Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    
        const schemaWithEmbeddedDocFK = new mongoD.Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                required: true,
            },
        });

        await mongoD.MongoModel("ModelWithObjectIdFK", schemaWithObjectIdFK);

        try {
            await mongoD.MongoModel("ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK);

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoD.relations)).toHaveLength(1);

            const schemaWithEmbeddedDocFKUnlinked = new mongoD.Schema({
                related: {
                    type: mongoD.Schema.Types.ObjectId,
                    required: true,
                    _linked: false
                },
            });

            await mongoD.MongoModel("ModelWithEmbeddedDocFKUnlinked", schemaWithEmbeddedDocFKUnlinked);

            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoD.relations)).toHaveLength(1);
        }
    });    

    it("should create a model and process foreign indexed keys", async () => {
        const testSchema2 = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                index: true
            },
        });

        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema2);

        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(1);

        expect(Object.entries(TestModel._FKS)).toHaveLength(1);
        expect(TestModel._FKS).toMatchObject({
            "RelatedModel": [
                {
                    path: "related",
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should create with an array of references", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", new mongoD.Schema({
            label: { type: String, required: true },
        }));
        const RelatedModel = await mongoD.MongoModel("RelatedModel", new mongoD.Schema({
            children: [{ type: mongoD.Schema.Types.ObjectId, ref: "TestModel", required: true }],
            po: [String]
        }));

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(mongoD.models).toHaveProperty("TestModel");
        expect(mongoD.models).toHaveProperty("RelatedModel");
        expect(Object.entries(mongoD.relations)).toHaveLength(0);

        expect(RelatedModel).not.toHaveProperty("_FKS");
    });

    it("should delete all cache after collection drop", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", new mongoD.Schema({
            label: { type: String, required: true },
        }));
        
        await TestModel.collection.drop();

        expect(Object.entries(mongoose.models)).toHaveLength(0);
        expect(Object.entries(mongoD.models)).toHaveLength(0);
    });

    it("should handle getActivate error", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoD.MongoModel(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_getActiveForeignKeys": async () => {
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoD.models).not.toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoose.models)).toHaveLength(1);
            expect(mongoose.models).toHaveProperty("RelatedModel");

            const TestModel = await mongoD.MongoModel("TestModel", testSchema);
            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            expect(mongoD.models).toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");

            expect(Object.entries(TestModel._FKS)).toHaveLength(1);
            expect(TestModel._FKS).toMatchObject({
                "RelatedModel": [
                    {
                        path: "related",
                        required: true,
                        immutable: false,
                        unique: false,
                        array: false,
                    }
                ]
            });
        }
    });

    it("should handle populateForeignKeyMetadata error", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoD.MongoModel(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_populateForeignKeyMetadata": async () => {
                        throw new Error("Mocked error")
                    }
                }
            );

            expect(true).toBe(false);
        } catch (e) {
            expect(mongoD.models).not.toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");
            expect(Object.entries(mongoD.models)).toHaveLength(1);
            expect(Object.entries(mongoose.models)).toHaveLength(1);
            expect(mongoose.models).toHaveProperty("RelatedModel");

            const TestModel = await mongoD.MongoModel("TestModel", testSchema);
            expect(Object.entries(mongoD.models)).toHaveLength(2);
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            expect(mongoD.models).toHaveProperty("TestModel");
            expect(mongoD.models).toHaveProperty("RelatedModel");

            expect(Object.entries(TestModel._FKS)).toHaveLength(1);
            expect(TestModel._FKS).toMatchObject({
                "RelatedModel": [
                    {
                        path: "related",
                        required: true,
                        immutable: false,
                        unique: false,
                        array: false,
                    }
                ]
            });
        }
    });
}, 0);
