import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_, _FKS_MODEL_ } from "../models.js";
import { InitMongoModels, MongoModel } from "../mongoClass.js";
import { ForeignKeyCreator } from "../creation.js";


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
        vi.restoreAllMocks();
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

    test("Should duplicate FK creation", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });

        const t1 = await TestModel.create({ name: "Test", related: related._id });

        const t2 = await TestModel.create({ name: "DUP", related: related._id });

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const tests = await TestModel.find({});
        const relateds = await RelatedModel.find({});

        expect(fks).toHaveLength(2);
        expect(fksModel).toHaveLength(1);
        expect(tests).toHaveLength(2);
        expect(relateds).toHaveLength(1);

        const normalizedFks = fks.map(fk => ({
            parent_id: fk.parent_id.toString(),
            parent_ref: fk.parent_ref,
            child_id: fk.child_id.toString(),
            child_ref: fk.child_ref,
            child_fullPath: fk.child_fullPath,
        }));
        
        expect(normalizedFks[0]).toEqual(
            {
                parent_id: t1._id.toString(),
                parent_ref: "TestModel",
                child_id: related._id.toString(),
                child_ref: "RelatedModel",
                child_fullPath: "related",
            },
        );

        expect(normalizedFks[1]).toEqual(
            {
                parent_id: t2._id.toString(),
                parent_ref: "TestModel",
                child_id: related._id.toString(),
                child_ref: "RelatedModel",
                child_fullPath: "related",
            },
        );
    });

    test("Should cleanup FKs when creation fails", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });

        vi.spyOn(ForeignKeyCreator.prototype, "create").mockImplementation(() => {
            throw new Error("Simulated error");
        });        

        await expect(TestModel.create({ name: "Test", related: related._id })).rejects.toThrow("Simulated error");

        const fkCount = await _FKS_.countDocuments();
        expect(fkCount).toBe(0);
    });

    it("should create various fk in database", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        
        const tests = [];
        for (let i = 0; i < 10; i++) {
            const test = await TestModel.create({ name: `test-${i}`, related: related });
            tests.push(test);
        }

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const testsModels = await TestModel.find({});
        const relatedsModels = await RelatedModel.find({});

        expect(fks).toHaveLength(10);
        expect(fksModel).toHaveLength(1);
        expect(testsModels).toHaveLength(10);
        expect(tests).toHaveLength(10);
        expect(relatedsModels).toHaveLength(1);

        const normalizedFks = fks.map(fk => ({
            parent_id: fk.parent_id.toString(),
            parent_ref: fk.parent_ref,
            child_id: fk.child_id.toString(),
            child_ref: fk.child_ref,
            child_fullPath: fk.child_fullPath,
        }));
        
        const expectedFks = testsModels.map(test => ({
            parent_id: test._id.toString(),
            parent_ref: "TestModel",
            child_id: related._id.toString(),
            child_ref: "RelatedModel",
            child_fullPath: "related",
        }));
    
        expect(normalizedFks).toEqual(expectedFks);
    });

    it("should create insertMany fk in database", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        
        const tests = [];
        for (let i = 0; i < 10; i++) {
            const test = { name: `test-${i}`, related: related};
            tests.push(test);
        }

        const createdTests = await TestModel.insertMany(tests);

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const testsModels = await TestModel.find({});
        const relatedsModels = await RelatedModel.find({});

        expect(fks).toHaveLength(10);
        expect(fksModel).toHaveLength(1);
        expect(testsModels).toHaveLength(10);
        expect(tests).toHaveLength(10);
        expect(createdTests).toHaveLength(10);
        expect(relatedsModels).toHaveLength(1);

        const normalizedFks = fks.map(fk => ({
            parent_id: fk.parent_id.toString(),
            parent_ref: fk.parent_ref,
            child_id: fk.child_id.toString(),
            child_ref: fk.child_ref,
            child_fullPath: fk.child_fullPath,
        }));
        
        const expectedFks = testsModels.map(test => ({
            parent_id: test._id.toString(),
            parent_ref: "TestModel",
            child_id: related._id.toString(),
            child_ref: "RelatedModel",
            child_fullPath: "related",
        }));
    
        expect(normalizedFks).toEqual(expectedFks);
    });

    it("should handle instance save correctly", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        const test = TestModel({ name: "test", related: related });
        await test.save();

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

    it("should not create foreign key when schema lacks __linked", async () => {
        const TestModel = await MongoModel("TestModel", new mongoose.Schema({
            name: { type: String, required: true },
            related: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "RelatedModel",
                required: true,
            },
        }));
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        const test = await TestModel.create({ name: "test", related: related });

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const tests = await TestModel.find({});
        const relateds = await RelatedModel.find({});

        expect(fks).toHaveLength(0);
        expect(fksModel).toHaveLength(0);
        expect(tests).toHaveLength(1);
        expect(relateds).toHaveLength(1);
    });

    it("should create foreign keys for nested references", async () => {
        const TestModel = await MongoModel("TestModel", new mongoose.Schema({
            name: { type: String, required: true },
            nested: {
                related: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "RelatedModel",
                    required: true,
                    __linked: true
                },
                str: String
            }
        }));
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema);

        const related = await RelatedModel.create({ title: "Related" });
        const test = await TestModel.create({ name: "test", nested: { related: related } });

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
                child_fullPath: "nested.related",
            },
        ]);
    });

    it("should allow foreign key references across collections", async () => {
        const TestModel = await MongoModel("TestModel", testSchema, "CA");
        const RelatedModel = await MongoModel("RelatedModel", relatedSchema, "CB");

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

    it("should handle cyclic foreign key references", async () => {
        const TestModel = await MongoModel("TestModel", testSchema);
        const RelatedModel = await MongoModel("RelatedModel", new mongoose.Schema({
            name: { type: String, required: true },
            test: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "TestModel",
                __linked: true,
                required: true,
            },
        }));

        const id1 = new mongoose.Types.ObjectId();
        const id2 = new mongoose.Types.ObjectId();

        const related = await RelatedModel.create({ _id: id1, name: "Related", test: id2 });
        const test = await TestModel.create({ _id: id2, name: "test", related: id1 });

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const tests = await TestModel.find({});
        const relateds = await RelatedModel.find({});

        expect(fks).toHaveLength(2);
        expect(fksModel).toHaveLength(2);
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
                parent_id: id1.toString(),
                parent_ref: "RelatedModel",
                child_id: id2.toString(),
                child_ref: "TestModel",
                child_fullPath: "test",
            },
            {
                parent_id: id2.toString(),
                parent_ref: "TestModel",
                child_id: id1.toString(),
                child_ref: "RelatedModel",
                child_fullPath: "related",
            }
        ]);
    });

//
    it("should create foreign keys with an array of references", async () => {
        const RelatedModel = await MongoModel("RelatedModel", new mongoose.Schema({
            children: [{ type: mongoose.Schema.Types.ObjectId, ref: "TestModel", __linked: true, required: true }],
        }));
        const TestModel = await MongoModel("TestModel", new mongoose.Schema({
            label: { type: String, required: true },
        }));

        const child1 = await TestModel.create({ label: "Child1" });
        const child2 = await TestModel.create({ label: "Child2" });

        const parent = await RelatedModel.create({ children: [child1._id, child2._id] });

        const fks = await _FKS_.find({});
        const fksModel = await _FKS_MODEL_.find({});
        const tests = await TestModel.find({});
        const relateds = await RelatedModel.find({});

        expect(fksModel).toHaveLength(1);
        expect(tests).toHaveLength(2);
        expect(relateds).toHaveLength(1);
        expect(fks).toHaveLength(2);

        const normalizedFks = fks.map(fk => ({
            parent_id: fk.parent_id.toString(),
            parent_ref: fk.parent_ref,
            child_id: fk.child_id.toString(),
            child_ref: fk.child_ref,
            child_fullPath: fk.child_fullPath,
        }));
        
        expect(normalizedFks).toEqual([
            {
                parent_id: related._id.toString(),
                parent_ref: "RelatedModel",
                child_id: child1.toString(),
                child_ref: "TestModel",
                child_fullPath: "test",
            },
            {
                parent_id: related._id.toString(),
                parent_ref: "RelatedModel",
                child_id: child2.toString(),
                child_ref: "TestModel",
                child_fullPath: "test",
            }
        ]);
    });

    it("should support multiple __linked fields in a schema", async () => {
        return;
        const MultiLinkedModel = await MongoModel("MultiLinkedModel", new mongoose.Schema({
            primary: { type: mongoose.Schema.Types.ObjectId, ref: "PrimaryModel", __linked: true, required: true },
            secondary: { type: mongoose.Schema.Types.ObjectId, ref: "SecondaryModel", __linked: true, required: true },
        }));
        const PrimaryModel = await MongoModel("PrimaryModel", new mongoose.Schema({ name: { type: String, required: true } }));
        const SecondaryModel = await MongoModel("SecondaryModel", new mongoose.Schema({ name: { type: String, required: true } }));

        const primary = await PrimaryModel.create({ name: "PrimaryInstance" });
        const secondary = await SecondaryModel.create({ name: "SecondaryInstance" });

        const multiLinked = await MultiLinkedModel.create({ primary: primary._id, secondary: secondary._id });

        const fks = await _FKS_.find({});
        expect(fks).toHaveLength(2);
    });
});