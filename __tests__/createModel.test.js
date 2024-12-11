import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_MODEL_, _FKS_ } from "../models.js";
import { InitMongoModels } from "../mongoClass.js";

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

        await _FKS_MODEL_.deleteMany({});
        await _FKS_.deleteMany({});

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
        return;
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
        return;
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
        return;
        const simpleSchema = new mongoD.Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await mongoD.MongoModel("SimpleModel", simpleSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });

    it("should support multiple foreign keys in a single model", async () => {
        return;
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
        return;
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);

        await TestModel.collection.drop();

        expect(Object.entries(mongoD.models)).toHaveLength(0);
    });

    it("should process deeply nested foreign keys", async () => {
        return;
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
                    }
                }
            },
            lo: [String]
        });

        const NestedModel = await mongoD.MongoModel("NestedModel", nestedSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("NestedModel");

        expect(Object.entries(NestedModel._FKS)).toHaveLength(1);
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
        return;
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
        return;
        const anotherTestSchema = new mongoD.Schema({
            anotherName: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
        });

        const AnotherTestModel = await mongoD.MongoModel("AnotherTestModel", anotherTestSchema);

        const fksModels = await _FKS_MODEL_.find({ model: "AnotherTestModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toMatchObject({
            model: "AnotherTestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isRequired: true,
        });
    });

    it("should correctly delete a foreign key model and not affect other models", async () => {
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);
        const AnotherTestModel = await mongoD.MongoModel("AnotherTestModell", testSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(3);
        expect(Object.entries(mongoD.relations)).toHaveLength(1);
        expect(mongoD.relations["RelatedModel"]).toContain(["TestModel", "AnotherTestModell"]);
        expect(TestModel).toHaveProperty("_FKS");
        expect(AnotherTestModel).toHaveProperty("_FKS");

        await RelatedModel.collection.drop();

        expect(Object.entries(mongoD.models)).toHaveLength(2);
        expect(TestModel).not.toHaveProperty("_FKS");
        expect(AnotherTestModel).not.toHaveProperty("_FKS");

        expect(Object.entries(mongoD.relations)).toHaveLength(0);
    });

    it("should handle multiple foreign key relationships in a single model", async () => {
        return;
        const multiRelatedSchema = new mongoD.Schema({
            name: { type: String, required: true },
            relatedOne: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
            relatedTwo: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: false,
            },
        });
    
        const MultiRelatedModel = await mongoD.MongoModel("MultiRelatedModel", multiRelatedSchema);
    
        const fksModels = await _FKS_MODEL_.find({ model: "MultiRelatedModel" });
        expect(fksModels).toHaveLength(2);
        expect(fksModels).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ fk: "relatedOne" }),
                expect.objectContaining({ fk: "relatedTwo" }),
            ])
        );
    });

    it("should handle foreign key field name updates correctly", async () => {
        return;
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const fks_models = await _FKS_MODEL_.create({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isArray: false,
            fk_isImmutable: false,
            fk_isRequired: false,
            fk_isUnique: false,
        });

        const testSchema2 = new mongoD.Schema({
            name: { type: String, required: true },
            related2: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
        });
        const TestModel = await mongoD.MongoModel("TestModel", testSchema2);
    
        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(2);

        const fks = TestModel.__FKS__;

        console.log(fks);
        expect(Object.entries(fks)).toHaveLength(1);
        expect(fks["related2"]).toMatchObject({
            ref: "RelatedModel",
            activated: true
        });
    });

    it("should handle circular references", async () => {
        return;
        const circularSchemaA = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelB",
                __linked: true,
                required: true,
            },
        });
    
        const circularSchemaB = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "ModelA",
                __linked: true,
                required: true,
            },
        });
    
        const ModelA = await mongoD.MongoModel("ModelA", circularSchemaA);
        const ModelB = await mongoD.MongoModel("ModelB", circularSchemaB);
    
        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(2);

        expect(fksModels[0]).toMatchObject({
            model: "ModelA",
            fk_ref: "ModelB"
        });
        expect(fksModels[1]).toMatchObject({
            model: "ModelB",
            fk_ref: "ModelA"
        });
    });

    it("should error if not given ref in foreign key", async () => {
        return;
        const schemaWithObjectIdFK = new mongoD.Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                __linked: true
            },
        });
    
        const schemaWithEmbeddedDocFK = new mongoD.Schema({
            related: {
                type: mongoD.Schema.Types.ObjectId,
                required: true,
                __linked: true
            },
        });

        const ModelWithObjectIdFK = await mongoD.MongoModel("ModelWithObjectIdFK", schemaWithObjectIdFK);

        try {
            const ModelWithEmbeddedDocFK = await mongoD.MongoModel("ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK);

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            const fks = await _FKS_MODEL_.find({});
            expect(fks).toHaveLength(1);
        }
    });    

    it("should create a model and process foreign indexed keys", async () => {
        return;
        const testSchema2 = new mongoD.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
                index: true
            },
        });

        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        const TestModel = await mongoD.MongoModel("TestModel", testSchema2);

        expect(syncedModels.get()).toHaveProperty("TestModel");
        expect(syncedModels.get()).toHaveProperty("RelatedModel");

        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toMatchObject({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isRequired: true,
        });
    });

    it("should handle cyclic foreign key reference", async () => {
        return;
        const TestModel = await mongoD.MongoModel("TestModel", testSchema);
        const RelatedModel = await mongoD.MongoModel("RelatedModel", new mongoD.Schema({
            name: { type: String, required: true },
            test: {
                type: mongoD.Schema.Types.ObjectId,
                ref: "TestModel",
                __linked: true,
                required: true,
            },
        }));

        expect(syncedModels.get()).toHaveProperty("TestModel");
        expect(syncedModels.get()).toHaveProperty("RelatedModel");

        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(2);
        expect(fksModels[0]).toMatchObject({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isRequired: true,
        });
        expect(fksModels[1]).toMatchObject({
            model: "RelatedModel",
            fk: "test",
            fk_ref: "TestModel",
            fk_isRequired: true,
        });
    });

    it("should create with an array of references", async () => {
        return;
        const TestModel = await mongoD.MongoModel("TestModel", new mongoD.Schema({
            label: { type: String, required: true },
        }));
        const RelatedModel = await mongoD.MongoModel("RelatedModel", new mongoD.Schema({
            children: [{ type: mongoD.Schema.Types.ObjectId, ref: "TestModel", __linked: true, required: true }],
            po: [String]
        }));

        const fksModels = await _FKS_MODEL_.find({});

        expect(fksModels).toHaveLength(1);

        expect(fksModels[0]).toMatchObject({
            model: "RelatedModel",
            fk: "children",
            fk_ref: "TestModel",
            fk_isRequired: true,
            fk_isArray: true
        });
    });
}, 0);
