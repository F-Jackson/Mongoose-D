import { describe, it, beforeEach, expect } from "vitest";
import mongoose from "mongoose";
import { _FKS_MODEL_, _FKS_ } from "../models.js";
import { InitMongoModels } from "../mongoClass.js";
import { deleteFromMongoose } from "../utils.js";

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

        mongoD = new InitMongoModels();
        //relatedSchema = mongoD.NewSchema({
            //title: { type: String, required: true },
        //});
        //testSchema = mongoD.NewSchema({
            //name: { type: String, required: true },
            //related: {
                //type: mongoD.Schema.Types.ObjectId,
                //ref: "RelatedModel",
                //required: true,
            //},
        //});
    });

    afterEach(async () => {
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
        const simpleSchema = mongoD.NewSchema({
            simpleField: { type: String, required: true },
        });

        const SimpleModel = await mongoD.MongoModel("SimpleModel", simpleSchema);

        expect(Object.entries(mongoD.models)).toHaveLength(1);
        expect(mongoD.models).toHaveProperty("SimpleModel");

        expect(SimpleModel).not.toHaveProperty("_FKS");
    });

    it("should support multiple foreign keys in a single model", async () => {
        return;
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
        // Simulação do método `NewSchema`
function simulateNewSchema(obj, options) {
    return new Promise((resolve) => {
        const delay = Math.random() * 2000; // Tempo de delay aleatório
        setTimeout(() => {
            const result = {
                schemaName: obj.name,
                options: options,
                createdAt: new Date().toISOString(),
            };
            console.log(`Schema criado:`, result);
            resolve(result); // Retorna o objeto criado
        }, delay);
    });
}

// Fila para armazenar as operações
const queue = [];

// Função para processar as operações da fila
async function processQueue() {
    if (queue.length === 0) return;

    const { resolve, reject, obj, options } = queue[0]; // Pega o primeiro item
    queue.shift(); // Remove o item da fila

    try {
        const result = await simulateNewSchema(obj, options); // Executa o método
        resolve(result); // Resolve a promessa com o resultado
    } catch (err) {
        reject(err); // Rejeita a promessa em caso de erro
    } finally {
        processQueue(); // Processa o próximo item
    }
}

// Método `NewSchema` com controle de concorrência
function NewSchema(obj, options) {
    return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, obj, options }); // Adiciona à fila

        if (queue.length === 1) {
            processQueue(); // Processa imediatamente se for o único item
        }
    });
}

// Testando a função `NewSchema` com await para chamadas sequenciais
async function test() {
    console.log("Iniciando...");

    const result1 = await NewSchema({ name: "User" }, { optionA: true });
    console.log("Resultado 1:", result1);

    const result2 = await NewSchema({ name: "Product" }, { optionB: false });
    console.log("Resultado 2:", result2);

    const result3 = await NewSchema({ name: "Order" }, { optionC: "value" });
    console.log("Resultado 3:", result3);

    console.log("Todos os schemas foram criados sequencialmente.");
}

test();

return;
  
  
  
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
        const k = new mongoose.Schema({
            k: [String]
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
        return;
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
        return;
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
        return;
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
        return;
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
        return;
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
        return;
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
        return;
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
        return;
        const TestModel = await mongoD.MongoModel("TestModel", mongoD.NewSchema({
            label: { type: String, required: true },
        }));
        
        await TestModel.collection.drop();

        expect(Object.entries(mongoose.models)).toHaveLength(0);
        expect(Object.entries(mongoD.models)).toHaveLength(0);
    });

    it("should handle getActivate error", async () => {
        return;
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoD.MongoModel(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_getActiveForeignKeys": async () => {
                        return;
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
        return;
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);

        try{
            const TestModel = await mongoD.MongoModel(
                "TestModel", testSchema, undefined, undefined, 
                {
                    "_populateForeignKeyMetadata": async () => {
                        return;
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

    it("should handle collection drop data inside db", async () => {
        return;
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });

        expect((await RelatedModel.find({}))).toHaveLength(1);
        let db = mongoose.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await RelatedModel.collection.drop();
        db = mongoose.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(0);
        expect(collections.map(col => col.name)).not.toContain("relatedmodels");

        const RelatedModel2 = await mongoD.MongoModel("RelatedModel", relatedSchema);
        expect((await RelatedModel2.find({}))).toHaveLength(0);

        await RelatedModel2.create({
            title: "test"
        });
        expect((await RelatedModel2.find({}))).toHaveLength(1);
        db = mongoose.connection.db;
        collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");
    });

    it("should handle erro data inside db", async () => {
        return;
        const RelatedModel = await mongoD.MongoModel("RelatedModel", relatedSchema);
        await RelatedModel.create({
            title: "test"
        });
        expect((await RelatedModel.find({}))).toHaveLength(1);
        let db = mongoose.connection.db;
        let collections = await db.listCollections().toArray();
        expect(collections.map(col => col.name)).toHaveLength(1);
        expect(collections.map(col => col.name)).toContain("relatedmodels");

        await deleteFromMongoose("RelatedModel");
        delete mongoD.models["RelatedModel"];

        db = mongoose.connection.db;
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
        db = mongoose.connection.db;
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
