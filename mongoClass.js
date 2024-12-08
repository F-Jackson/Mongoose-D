import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { _FKS_MODEL_ } from "./models.js";
import { getFuncs, changeCreation, changeDeletion } from "./changeFuncs.js";

export let syncModels = {};

export const MongoModel = async(
    name,
    schema,
    collection,
    options
) => {
    if (name in syncModels) throw new Error("Model name already exists");

    const mongoModel = mongoose.model(name, schema, collection, options);

    const foreignKeyProcessor = new ForeignKeyProcessor({
        mongoModel: mongoModel,
        _FKS_MODEL_: _FKS_MODEL_
    });
    await foreignKeyProcessor.processForeignKeys();

    //const oldFuncs = await getFuncs(mongoModel);
    //await changeCreation(mongoModel, oldFuncs);
    //await changeDeletion(mongoModel, oldFuncs);

    syncModels[mongoModel.modelName] = mongoModel;
    return mongoModel;
};
