import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_, _FKS_MODEL_ } from "../models.js";
import { InitMongoModels, MongoModel } from "../mongoClass.js";

const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

describe("Mongo instance creation", () => {
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

        const synced = await syncedModels.get();
        
        for (const value of Object.values(synced)) {
            await value.deleteMany({});
            await value.collection.drop();
        }

        await syncedModels.set([]);

        for (let model in mongoose.models) {
            delete mongoose.models[model];
        }
    });

    afterEach(async () => {
        await mongoose.connection.close();
    });

    it("should create fk in database", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        const test = await TestModel.create({ name: "test", related: related });

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const tests = await TestModel.find({});
        const relateds = await RelatedModel.find({});

        expect(fks).toHaveLength(1);
        expect(fksModel).toHaveLength(1);
        expect(tests).toHaveLength(1);
        expect(relateds).toHaveLength(1);

        const normalizedFks = fks.map(fk => ({
            parent_id: fk.parent_id.toString(),
            parent_ref: fk.parent_ref,
            child_id: fk.child_id.toString(),
            child_ref: fk.child_ref,
            child_fullPath: fk.child_fullPath,
        }));
        
        expect(normalizedFks).toEqual([
            {
                parent_id: test._id.toString(),
                parent_ref: "TestModel",
                child_id: related._id.toString(),
                child_ref: "RelatedModel",
                child_fullPath: "related",
            },
        ]);
    });
});