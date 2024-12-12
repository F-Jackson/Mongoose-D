import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { _FKS_, _FKS_MODEL_ } from "./models.js";
import { getFuncs, changeCreation, changeDeletion, changeDrop } from "./changeFuncs.js";


export class InitMongoModels {
    constructor() {
        this.models = {};
        this.relations = {};
        this.Schema = mongoose.Schema;
    }

    addRelation(relation, modelName) {
        if (!this.relations[relation]) {
            this.relations[relation] = [ modelName ];
        } else if (!this.relations[relation].includes(modelName)) {
            this.relations[relation].push(modelName);
        }
    }

    getRelations() {
        return JSON.parse(JSON.stringify(this.relations));
    }

    async MongoModel (
        name,
        schema,
        collection,
        options
    ) {
        if (name in this.models) throw new Error("Model already exists");

        const mongoModel = await mongoose.model(name, schema, collection, options);

        const oldFuncs = await getFuncs(mongoModel);
        
        await changeDrop(this, mongoModel, oldFuncs);
    
        const foreignKeyProcessor = new ForeignKeyProcessor(
            mongoModel,
            this
        );
        await foreignKeyProcessor.processForeignKeys();
    
        //await changeCreation(mongoModel, oldFuncs);
        //await changeDeletion(mongoModel, oldFuncs);
    
        this.models[name] = mongoModel;
        return mongoModel;
    };
}
