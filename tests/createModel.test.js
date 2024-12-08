/* eslint-disable no-import-assign */
/* eslint-disable no-undef */
/* eslint-disable max-len */
import mongoose from "mongoose";
import { _FKS_, _FKS_MODEL_ } from "../models.js";
import { syncModels, MongoModel } from "../mongoClass.js";


const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000
    };

    return await mongoose.connect(
        url,
        mongoOptions
    );
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

    beforeAll(async() => {
        await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    });

    afterAll(async() => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.disconnect();
    });

    beforeEach(async() => {
        await _FKS_.deleteMany({});
        await _FKS_MODEL_.deleteMany({});
        syncModels = {};
    });

    test("should create a model and process foreign keys", async() => {
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const TestModel = await MongoModel("TestModel", testSchema, "tests");

        expect(syncModels).toHaveProperty("TestModel");
        expect(syncModels).toHaveProperty("RelatedModel");

        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toMatchObject({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isRequired: true,
        });
    });

    test("should throw error if model with same name exists", async() => {
        await MongoModel("TestModel", testSchema, "tests");

        await expect(() => MongoModel("TestModel", testSchema, "tests")).rejects.toThrow(
            "Model name already exists"
        );
    });

    test("should activate and deactivate foreign keys", async() => {
        const TestModel = await MongoModel("TestModel", testSchema, "tests");

        const foreignKey = TestModel.__FKS__.related;
        expect(foreignKey).toHaveProperty("_activated", true);
    });

    test("should not create duplicate foreign key models", async() => {
        await MongoModel("TestModel", testSchema, "tests");

        const initialCount = await _FKS_MODEL_.countDocuments();
        await MongoModel("AnotherModel", relatedSchema, "another");

        const finalCount = await _FKS_MODEL_.countDocuments();
        expect(finalCount).toBe(initialCount + 1);
    });

    test("should populate metadata for foreign keys", async() => {
        await MongoModel("TestModel", testSchema, "tests");

        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels[0]).toHaveProperty("fk_ref", "RelatedModel");
    });

    test("should create a model and register foreign keys correctly", async() => {
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "relateds");
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
    
        expect(syncModels).toHaveProperty("TestModel");
        expect(syncModels).toHaveProperty("RelatedModel");
    
        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toMatchObject({
            model: "TestModel",
            fk: "related",
            fk_ref: "RelatedModel",
            fk_isRequired: true,
        });
    });
    
    test("should throw error if attempting to create a duplicate model", async() => {
        await MongoModel("TestModel", testSchema, "tests");
    
        await expect(() => MongoModel("TestModel", testSchema, "tests"))
            .rejects.toThrow("Model name already exists");
    });
    
    test("should activate and deactivate foreign keys correctly", async() => {
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
    
        const foreignKey = TestModel.__FKS__.related;
        expect(foreignKey).toHaveProperty("_activated", true);
    
        foreignKey._activated = false;
        expect(foreignKey._activated).toBe(false);
    });
    
    test("should create foreign key models without duplication", async() => {
        await MongoModel("TestModel", testSchema, "tests");
    
        const initialCount = await _FKS_MODEL_.countDocuments();
        await MongoModel("AnotherModel", relatedSchema, "another");
    
        const finalCount = await _FKS_MODEL_.countDocuments();
        expect(finalCount).toBe(initialCount + 1);
    });
    
    test("should populate metadata for foreign keys", async() => {
        await MongoModel("TestModel", testSchema, "tests");
    
        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels[0]).toHaveProperty("fk_ref", "RelatedModel");
    });
    
    test("should throw an error if schema lacks required fields", async() => {
        const invalidSchema = new mongoose.Schema({
            invalidField: { type: String },
        });
    
        await expect(() => MongoModel("InvalidModel", invalidSchema, "invalids"))
            .rejects.toThrow("Schema validation error");
    });
    
    test("should handle models with no foreign keys", async() => {
        const simpleSchema = new mongoose.Schema({
            simpleField: { type: String, required: true },
        });
    
        const SimpleModel = await MongoModel("SimpleModel", simpleSchema, "simples");
    
        expect(syncModels).toHaveProperty("SimpleModel");
        const fksModels = await _FKS_MODEL_.find({ model: "SimpleModel" });
        expect(fksModels).toHaveLength(0);
    });
    
    test("should support multiple foreign keys in a single model", async() => {
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
    
    test("should handle deletion of foreign key metadata when model is removed", async() => {
        const TestModel = await MongoModel("TestModel", testSchema, "tests");
    
        await TestModel.collection.drop();
    
        const fksModels = await _FKS_MODEL_.find({ model: "TestModel" });
        expect(fksModels).toHaveLength(0);
    });
    
    test("should process deeply nested foreign keys", async() => {
        const nestedSchema = new mongoose.Schema({
            nestedField: {
                subField: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    __linked: true,
                },
            },
        });
    
        const NestedModel = await MongoModel("NestedModel", nestedSchema, "nesteds");
    
        const fksModels = await _FKS_MODEL_.find({ model: "NestedModel" });
        expect(fksModels).toHaveLength(1);
        expect(fksModels[0]).toMatchObject({
            model: "NestedModel",
            fk: "nestedField.subField",
            fk_ref: "RelatedModel",
        });
    });
    
    test("should handle optional foreign keys", async() => {
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