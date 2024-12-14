import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { RelationSchema } from "./models.js";
import { getFuncs, changeCreation, changeDrop } from "./changeFuncs.js";
import { deleteFromMongoose } from "./utils.js";


function shallowCopyFunction(originalFunction) {
    // Cria uma função que chama a função original
    const copiedFunction = function(...args) {
        return originalFunction.apply(this, args);
    };

    // Copia as propriedades da função original para a nova função
    Object.keys(originalFunction).forEach(key => {
        copiedFunction[key] = originalFunction[key];
    });

    return copiedFunction;
}

export class InitMongoModels {
    constructor() {
        this.models = {};
        this.relations = {};
        this.oldRelations = {};
        this.Schema = mongoose.Schema;
    }

    addRelations(relations, modelName) {
        relations.forEach(relation => {
            if (!this.relations[relation]) {
                this.relations[relation] = [ modelName ];
                this.oldRelations[relation] = [ modelName ];
            } else if (!this.relations[relation].includes(modelName)) {
                this.relations[relation].push(modelName);
                this.oldRelations[relation].push(modelName);
            }
        });
    }

    resetRelations() {
        this.relations = JSON.parse(JSON.stringify(this.oldRelations));
    }

    NewSchema(obj, options) {
        obj["_FKS"] = RelationSchema;

        // Criar uma cópia simples do mongoose.Schema
        const mongoSchema = class extends mongoose.Schema {};

        const properties = {};
        const originalPath = mongoSchema.prototype.path;

        // Substituir o método `path` do protótipo do Schema
        mongoSchema.prototype.path = function (path, obj) {
            if (!obj) {
                return originalPath.call(this, path); // Contexto correto
            }
            // Salvar as propriedades personalizadas
            properties[path] = obj;
            return originalPath.call(this, path, obj); // Chamada com o contexto correto
        };

        const schema = new mongoSchema(obj, options);
        schema.__properties = properties;

        return schema;
    }

    async MongoModel (
        name,
        schema,
        collection,
        options,
        __mocks
    ) {
        if (name in this.models) throw new Error("Model already exists");

        const mongoModel = await mongoose.model(name, schema, collection, options);

        try {
            const oldFuncs = await getFuncs(mongoModel);
            await changeDrop(this, mongoModel, oldFuncs);

            const foreignKeyProcessor = new ForeignKeyProcessor(
                mongoModel,
                this
            );
            await foreignKeyProcessor.__mocktest(__mocks);
            await foreignKeyProcessor.processForeignKeys();

            await changeCreation(mongoModel, oldFuncs, this);
            //await changeDeletion(mongoModel, oldFuncs);
        
            this.models[name] = mongoModel;
        } catch (err) {
            await deleteFromMongoose(name);

            throw err;
        }

        return mongoModel;
    };
}
