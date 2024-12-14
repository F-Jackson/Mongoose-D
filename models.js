import { Schema } from "mongoose";
import mongoose from "mongoose";

export const RelationSchema = new Schema({
    to_id: mongoose.Schema.Types.ObjectId,
    from_id: mongoose.Schema.Types.ObjectId,
    toClass: String,
    fromClass: String,
    path: String,
});
