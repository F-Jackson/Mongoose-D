import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_MODEL_ } from "../models.js";
import { InitMongoModels, MongoModel } from "../mongoClass.js";

const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

describe("Mongo model creation", () => {
    const testSchema = new mongoose.Schema({
        name: { type: String, required: true },
        related: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RelatedModel",
            __linked: true,
            required: true,
        },
    });

    const relatedSchema = new mongoose.Schema({
        title: { type: String, required: true },
    });

    const syncedModels = InitMongoModels();

    beforeEach(async () => {
        await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

        const collections = await mongoose.connection.db.listCollections().toArray();
        const dropPromises = collections.map((collection) =>
            mongoose.connection.db.dropCollection(collection.name)
        );

        await Promise.all(dropPromises);

        await syncedModels.set([]);

        for (let model in mongoose.models) {
            delete mongoose.models[model];
        }
    });

    afterEach(async () => {
        await mongoose.connection.close();
    });

    it("should create a model and process foreign keys", async () => {
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const TestModel = await MongoModel("TestModel", testSchema, "tests");

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

    it("should throw error if model with same name exists", async () => {
        await MongoModel("TestModel", testSchema, "tests");

        await expect(() => MongoModel("TestModel", testSchema, "tests")).rejects.toThrow(
            "Model name already exists"
        );
    });

    it("should activate and deactivate foreign keys", async () => {
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
        const foreignKey = TestModel.__FKS__;
        expect(foreignKey.related).toHaveProperty("_activated", true);
    });

    it("should not create duplicate foreign key models", async () => {
        await MongoModel("TestModel", testSchema, "tests");

        const initialCount = await _FKS_MODEL_.countDocuments();
        await MongoModel("AnotherModel", relatedSchema, "another");

        const finalCount = await _FKS_MODEL_.countDocuments();
        expect(finalCount).toBe(initialCount);
    });

    it("should populate metadata for foreign keys", async () => {
        await MongoModel("TestModel", testSchema, "tests");

        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels[0]).toHaveProperty("fk_ref", "RelatedModel");
    });

    it("should handle models with no foreign keys", async () => {
        const simpleSchema = new mongoose.Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await MongoModel("SimpleModel", simpleSchema, "simples");

        expect(syncedModels.get()).toHaveProperty("SimpleModel");
        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(0);
    });

    it("should support multiple foreign keys in a single model", async () => {
        const multiFKSchema = new mongoose.Schema({
            name: { type: String, required: true },
            related1: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: false,
            },
        });

        const MultiFKModel = await MongoModel("MultiFKModel", multiFKSchema, "multifks");

        const fksModels = await _FKS_MODEL_.find({ model: "MultiFKModel" });
        expect(fksModels).toHaveLength(2);
        expect(fksModels).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ fk: "related1" }),
                expect.objectContaining({ fk: "related2" }),
            ])
        );
    });

    it("should handle deletion of foreign key metadata when model is removed", async () => {
        const TestModel = await MongoModel("TestModel", testSchema, "tests");

        await TestModel.collection.drop();

        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels).toHaveLength(0);
    });

    it("should process deeply nested foreign keys", async () => {
        const nestedSchema = new mongoose.Schema({
            nestedField: {
                subField: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    __linked: true,
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
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "RelatedModel",
                        __linked: true,
                    }
                }
            },
            lo: [String]
        });

        const NestedModel = await MongoModel("NestedModel", nestedSchema, "nesteds");

        const fksModels = await _FKS_MODEL_.find({ model: "NestedModel" });
        expect(fksModels).toHaveLength(2);
        expect(fksModels[0]).toMatchObject({
            model: "NestedModel",
            fk: "nestedField.subField",
            fk_ref: "RelatedModel",
        });
        expect(fksModels[1]).toMatchObject({
            model: "NestedModel",
            fk: "nestedField2.po2.subField",
            fk_ref: "RelatedModel",
        });
    });

    it("should handle optional foreign keys", async () => {
        const optionalSchema = new mongoose.Schema({
            optionalField: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: false,
            },
        });

        const OptionalModel = await MongoModel("OptionalModel", optionalSchema, "optionals");

        const fksModels = await _FKS_MODEL_.find({ model: "OptionalModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toHaveProperty("fk_isRequired", false);
    });

    //
    it("should handle foreign keys with non-required fields and validate properly", async () => {
        const nonRequiredFKSchema = new mongoose.Schema({
            nonRequiredField: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: false,
            },
        });

        const NonRequiredFKModel = await MongoModel("NonRequiredFKModel", nonRequiredFKSchema, "nonrequiredfks");

        const fksModels = await _FKS_MODEL_.find({ model: "NonRequiredFKModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toHaveProperty("fk_isRequired", false);
    });

    it("should handle foreign key deletion correctly when reference model is deleted", async () => {
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const TestModel = await MongoModel("TestModel", testSchema, "tests");

        const relatedDoc = await RelatedModel.create({ title: "Sample Related" });
        const testDoc = await TestModel.create({ name: "Test", related: relatedDoc._id });

        expect(await _FKS_MODEL_.countDocuments()).toBe(1);

        await RelatedModel.findByIdAndDelete(relatedDoc._id);
        await RelatedModel.collection.drop();

        expect(await _FKS_MODEL_.countDocuments()).toBe(0);
    });

    it("should process foreign keys when multiple models reference the same model", async () => {
        const anotherTestSchema = new mongoose.Schema({
            anotherName: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
        });

        const AnotherTestModel = await MongoModel("AnotherTestModel", anotherTestSchema, "anotherTests");

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
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
        const AnotherTestModel = await MongoModel("AnotherTestModell", testSchema, "anotherTests");

        expect(await _FKS_MODEL_.countDocuments()).toBe(2);

        await RelatedModel.collection.drop();
        expect(await _FKS_MODEL_.countDocuments()).toBe(0);

        const fksModelsTest = await _FKS_MODEL_.find({ model: "TestModel" });
        const fksModelsAnotherTest = await _FKS_MODEL_.find({ model: "AnotherTestModell" });
        expect(fksModelsTest).toHaveLength(0);
        expect(fksModelsAnotherTest).toHaveLength(0);
    });

    it("should handle multiple foreign key relationships in a single model", async () => {
        const multiRelatedSchema = new mongoose.Schema({
            name: { type: String, required: true },
            relatedOne: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
            relatedTwo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: false,
            },
        });
    
        const MultiRelatedModel = await MongoModel("MultiRelatedModel", multiRelatedSchema, "multiRelated");
    
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
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const fks_models = await _FKS_MODEL_.create({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isArray: false,
            fk_isImmutable: false,
            fk_isRequired: false,
            fk_isUnique: false,
        });

        const testSchema2 = new mongoose.Schema({
            name: { type: String, required: true },
            related2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                __linked: true,
                required: true,
            },
        });
        const TestModel = await MongoModel("TestModel", testSchema2, "tests");
    
        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(2);

        const fks = TestModel.__FKS__;

        expect(fks["related"]).toMatchObject({
            _fk_ref: "RelatedModel",
            _activated: false
        });
        expect(fks["related2"]).toMatchObject({
            _fk_ref: "RelatedModel",
            _activated: true
        });
    });

    it("should handle circular references", async () => {
        const circularSchemaA = new mongoose.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelB",
                __linked: true,
                required: true,
            },
        });
    
        const circularSchemaB = new mongoose.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ModelA",
                __linked: true,
                required: true,
            },
        });
    
        const ModelA = await MongoModel("ModelA", circularSchemaA, "modelAs");
        const ModelB = await MongoModel("ModelB", circularSchemaB, "modelBs");
    
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
        const schemaWithObjectIdFK = new mongoose.Schema({
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
                __linked: true
            },
        });
    
        const schemaWithEmbeddedDocFK = new mongoose.Schema({
            related: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                __linked: true
            },
        });

        const ModelWithObjectIdFK = await MongoModel("ModelWithObjectIdFK", schemaWithObjectIdFK, "modelWithObjectIdFK");

        try {
            const ModelWithEmbeddedDocFK = await MongoModel("ModelWithEmbeddedDocFK", schemaWithEmbeddedDocFK, "modelWithEmbeddedDocFK");

            expect(true).toBe(false);
        } catch (error) {
            expect(Object.entries(mongoose.models)).toHaveLength(2);
            const fks = await _FKS_MODEL_.find({});
            expect(fks).toHaveLength(1);
        }
    });    
});
