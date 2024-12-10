import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { _FKS_, _FKS_MODEL_ } from "./models.js";
import { getFuncs, changeCreation, changeDeletion, changeDrop } from "./changeFuncs.js";

export class SyncedModels {
    constructor() {
        this.syncModels = {};
    }

    get() {
        return { ...this.syncModels };
    }

    _addVerifyError(key, oldModels) {
        if (key in this.syncModels) {
            this.syncModels = oldModels;
            throw new Error("Synced model already exists for key: " + key);
        }
    }

    set(models) {
        const oldModels = this.get();
        const newModels = {};

        for (const [key, value] of models) {
            this._addVerifyError(key, oldModels);
            newModels[key] = value;
        }

        this.syncModels = newModels;
    }

    add(models) {
        const oldModels = this.get();

        for (const [key, value] of models) {
            this._addVerifyError(key, oldModels);
            this.syncModels[key] = value;
        }
    }
}

const syncedModelsInstance = new SyncedModels();

export const InitMongoModels = () => {
    return syncedModelsInstance;
};

export const MongoModel = async(
    name,
    schema,
    collection,
    options
) => {
    const syncModels = await syncedModelsInstance.get();
    if (name in syncModels) throw new Error("Model name already exists");

    const mongoModel = mongoose.model(name, schema, collection, options);

    const foreignKeyProcessor = new ForeignKeyProcessor(
        mongoModel,
        _FKS_MODEL_
    );
    await foreignKeyProcessor.processForeignKeys();

    const oldFuncs = await getFuncs(mongoModel);
    
    await changeDrop(mongoModel, oldFuncs);
    await changeCreation(mongoModel, oldFuncs);
    //await changeDeletion(mongoModel, oldFuncs);

    syncedModelsInstance.add([[mongoModel.modelName, mongoModel]]);
    return mongoModel;
};
