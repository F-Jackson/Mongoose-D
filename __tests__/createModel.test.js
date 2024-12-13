import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { deleteFromMongoose } from "../utils.js";
import { cleanDb, disconnectDb } from "./utils.js";

/***************************DROP COLLECTION IS NOT WORKING**************************************/

describe("Mongo model creation", () => {
    let testSchema;
    let relatedSchema;
    let mongoD;
    let mongoServer;
    let client;

    beforeEach(async () => {
        [mongoD, mongoServer, client] = await cleanDb(vi);

        relatedSchema = mongoD.NewSchema({
            title: { type: String, required: true },
        });
        testSchema = mongoD.NewSchema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    });

    afterEach(async () => {
        await disconnectDb(mongoServer);
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
                    path: ["related"],
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
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should handle models with no foreign keys", async () => {
        const simpleSchema = mongoD.NewSchema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await mongoD.MongoModel("SimpleModel", simpleSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });

    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = mongoD.NewSchema({
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
                    path: ["related1"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                },
                {
                    path: ["related2"],
                    required: false,
                    immutable: false,
                    unique: false,
                    array: false,
                },
            ]
        });
    });

    it("should handle deletion of foreign key metadata when model is removed", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", relatedSchema);
        await TestModel.create({title: "test"});
        await TestModel.dropCollection();

        expect(Object.entries(mongoD.models)).toHaveLength(0);
        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections).toHaveLength(0);
    });

    it("should process paths in schema", async () => {
        const nestedSchema = mongoD.NewSchema({
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

        expect(nestedSchema).toHaveProperty("__properties");
        const propertiesKeys = Object.entries(nestedSchema.__properties).map(([key, _]) => key);
        expect(propertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_FKS",
                "_id",
                "__v"
            ]
        );

        expect(NestedModel.schema).toHaveProperty("__properties");
        const modelPropertiesKeys = Object.entries(NestedModel.schema.__properties).map(([key, _]) => key);
        expect(modelPropertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_FKS",
                "_id",
                "__v"
            ]
        );
    });

    it("should isolate process paths in schema", async () => {
        const concurrentSchemaCreations = Promise.all([
            mongoD.NewSchema({
                nestedField: {
                    subField: {
                        type: mongoD.Schema.Types.ObjectId,
                        ref: "RelatedModel",
                        required: true,
                        unique: true,
                        immutable: true,
                    },
                    po: String,
                    ll: {
                        io: String,
                        h: String,
                    },
                },
                nestedField2: {
                    po2: {
                        subField: {
                            type: [mongoD.Schema.Types.ObjectId],
                            ref: "RelatedModel",
                        },
                        arrayTest: [
                            { type: mongoD.Schema.Types.ObjectId, ref: "RelatedModel", required: true },
                        ],
                    },
                },
                lo: [String],
            }),
            mongoD.NewSchema({
                isolated: [String],
            }),
        ]);
    
        const [nestedSchema, nestedSchema2] = await concurrentSchemaCreations;

        expect(nestedSchema).toHaveProperty("__properties");
        const propertiesKeys = Object.entries(nestedSchema.__properties).map(([key, _]) => key);
        expect(propertiesKeys).toHaveLength(9);
        expect(propertiesKeys).toMatchObject(
            [
                "nestedField.subField",
                "nestedField.po",
                "nestedField.ll.io",
                "nestedField.ll.h",
                "nestedField2.po2.subField",
                "nestedField2.po2.arrayTest",
                "lo",
                "_FKS",
                "_id",
            ]
        );

        expect(nestedSchema2).toHaveProperty("__properties");
        const propertiesKeys2 = Object.entries(nestedSchema2.__properties).map(([key, _]) => key);
        expect(propertiesKeys2).toHaveLength(3);
        expect(propertiesKeys2).toMatchObject(
            [
                "isolated",
                "_FKS",
                "_id",
            ]
        );
    });

    it("should process deeply nested foreign keys", async () => {
        const nestedSchema = mongoD.NewSchema({
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
                    path: ["nestedField", "subField"],
                    required: true,
                    immutable: true,
                    unique: true,
                    array: false,
                },
                {
                    path: ["nestedField2" , "po2", "subField"],
                    required: false,
                    immutable: false,
                    unique: false,
                    array: true,
                },
            ]
        });
    });

    it("should handle optional foreign keys", async () => {
        const optionalSchema = mongoD.NewSchema({
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
        const anotherTestSchema = mongoD.NewSchema({
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

        await RelatedModel.dropCollection();

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(TestModel).not.toHaveProperty("_FKS");
        expect(AnotherTestModel).not.toHaveProperty("_FKS");

        expect(Object.entries(mongoD.relations)).toHaveLength(0);
    });

    it("should handle circular references", async () => {
        const circularSchemaA = mongoD.NewSchema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelB",
                required: true,
            },
        });
    
        const circularSchemaB = mongoD.NewSchema({
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
                    path: ["related"],
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
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false
                },
            ]
        });
    });

    it("should error if not given ref in foreign key", async () => {
        const schemaWithObjectIdFK = mongoD.NewSchema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        });
    
        const schemaWithEmbeddedDocFK = mongoD.NewSchema({
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

            const schemaWithEmbeddedDocFKUnlinked = mongoD.NewSchema({
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
        const testSchema2 = mongoD.NewSchema({
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
                    path: ["related"],
                    required: true,
                    immutable: false,
                    unique: false,
                    array: false,
                }
            ]
        });
    });

    it("should create with an array of references", async () => {
        const TestModel = await mongoD.MongoModel("TestModel", mongoD.NewSchema({
            label: { type: String, required: true },
        }));
        const RelatedModel = await mongoD.MongoModel("RelatedModel", mongoD.NewSchema({
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
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);
        
        await TestModel.dropCollection();

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
                        path: ["related"],
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
                        path: ["related"],
                        required: true,
                        immutable: false,
                        unique: false,
                        array: false,
                    }
                ]
            });
        }
    });

    it("should handle collection drop data inside db", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });

        expect((await RelatedModel.find({}))).toHaveLength(1);

        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await RelatedModel.dropCollection();

        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(0);
        expect(collections.map(col => col.name)).not.toContain("relatedmodels");

        const RelatedModel2 = await mongoD.MongoModel("RelatedModel", relatedSchema);
        expect((await RelatedModel2.find({}))).toHaveLength(0);

        await RelatedModel2.create({
            title: "test"
        });
        expect((await RelatedModel2.find({}))).toHaveLength(1);
        
        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");
    });

    it("should handle erro data inside db", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });
        expect((await RelatedModel.find({}))).toHaveLength(1);

        let db = client.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await deleteFromMongoose("RelatedModel");
        delete mongoD.models["RelatedModel"];

        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        const RelatedModel2 = await mongoD.MongoModel("RelatedModel", mongoD.NewSchema({
            title: { type: String, required: true },
            name: String
        }));
        await RelatedModel2.create({
            title: "test",
            name: "test"
        });

        const models = await RelatedModel2.find({});

        expect(models).toHaveLength(2);
        
        db = client.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");
        expect(models).toMatchObject([
            {
                title: 'test',
            },
            {
                title: 'test',
                name: 'test',
            }
        ]);
    });
}, 0);
