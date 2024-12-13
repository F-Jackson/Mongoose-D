import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { _FKS_, _FKS_MODEL_ } from "./models.js";
import { getFuncs, changeCreation, changeDeletion, changeDrop } from "./changeFuncs.js";
import { deleteFromMongoose } from "./utils.js";


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
        // Criar uma cópia simples do mongoose.Schema
        const mongoSchema = mongoose.Schema;
        //Object.setPrototypeOf(mongoSchema, mongoose.Schema);
        //mongoSchema.prototype = Object.create(mongoose.Schema.prototype);

        const properties = {};
        const originalPath = mongoSchema.prototype.path;

        mongoSchema.prototype.path = (path, obj) => {
            if (!obj) return;
            console.log(path, obj);
            properties[path] = obj;
            return originalPath.call(this, path, obj);
        };

        const schema = mongoSchema(obj, options);
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

            //await changeCreation(mongoModel, oldFuncs);
            //await changeDeletion(mongoModel, oldFuncs);
        
            this.models[name] = mongoModel;
        } catch (err) {
            await deleteFromMongoose(name);

            throw err;
        }

        return mongoModel;
    };
}
