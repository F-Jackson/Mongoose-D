import mongoose from "mongoose";


export const deleteFromMongoose = async(name) => {
    const dbCollections = (await mongoose.connection.db.listCollections().toArray()).map(col => col.name);

    delete mongoose.connection.models[name];

    const dbCollection = `${name.toLowerCase()}s`;
    if (dbCollections.includes(dbCollection)) {
        mongoose.connection.db.dropCollection(dbCollection);
    }
}
