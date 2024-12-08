import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_, _FKS_MODEL_ } from "../models.js";
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

    let db = undefined;

    beforeAll(async () => {
        db = await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    });

    beforeEach(async () => {
        await _FKS_.deleteMany({});
        await _FKS_MODEL_.deleteMany({});
        await syncedModels.set([]);
    });

    it("should create a model and process foreign keys", async () => {
        return;
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
        return;
        await MongoModel("TestModel", testSchema, "tests");

        await expect(() => MongoModel("TestModel", testSchema, "tests")).rejects.toThrow(
            "Model name already exists"
        );
    });

    it("should activate and deactivate foreign keys", async () => {
        return;
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
        const foreignKey = TestModel.__FKS__;
        expect(foreignKey.related).toHaveProperty("_activated", true);
    });

    it("should not create duplicate foreign key models", async () => {
        return;
        await MongoModel("TestModel", testSchema, "tests");

        const initialCount = await _FKS_MODEL_.countDocuments();
        await MongoModel("AnotherModel", relatedSchema, "another");

        const finalCount = await _FKS_MODEL_.countDocuments();
        expect(finalCount).toBe(initialCount);
    });

    it("should populate metadata for foreign keys", async () => {
        return;
        await MongoModel("TestModel", testSchema, "tests");

        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels[0]).toHaveProperty("fk_ref", "RelatedModel");
    });

    it("should handle models with no foreign keys", async () => {
        return;
        const simpleSchema = new mongoose.Schema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await MongoModel("SimpleModel", simpleSchema, "simples");

        expect(syncedModels.get()).toHaveProperty("SimpleModel");
        const fksModels = await _FKS_MODEL_.find({});
        expect(fksModels).toHaveLength(0);
    });

    it("should support multiple foreign keys in a single model", async () => {
        return;
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
        return;
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
            fk: "subField",
            fk_ref: "RelatedModel",
        });
    });

    it("should handle optional foreign keys", async () => {
        return;
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
});
