import mongoose from "mongoose";


export const deleteFromMongoose = async(name) => {
    delete mongoose.connection.models[name];
}
