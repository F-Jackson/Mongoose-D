import { Schema } from "mongoose";
import mongoose from "mongoose";


const __FKS__ = new Schema({
    parent_id: {
        type: String,
        required: true,
        minLength: 0,
    },
    parent_ref: {
        type: String,
        required: true,
        immutable: true,
        minLength: 0
    },
    child_id: {
        type: String,
        required: true,
        immutable: true
    },
    child_ref: {
        type: String,
        required: true,
        immutable: true,
        minLength: 0
    },
});

const __FKS__MODEL__ = new Schema({
    model: {
        type: String,
        required: true,
        immutable: true,
        minLength: 0,
    },
    fk: {
        type: String,
        required: true,
        immutable: true,
        minLength: 0
    },
    fk_ref: {
        type: String,
        required: true,
        immutable: true,
        minLength: 0
    },
    fk_isArray: {
        type: Boolean,
        required: true,
        immutable: true,
        default: false
    },
    fk_isImmutable: {
        type: Boolean,
        required: true,
        immutable: true,
        default: false
    },
    fk_isRequired: {
        type: Boolean,
        required: true,
        immutable: true,
        default: false
    },
    fk_isUnique: {
        type: Boolean,
        required: true,
        immutable: true,
        default: false
    },
});

export const _FKS_ = mongoose.model("__FKS__", __FKS__);
export const _FKS_MODEL_ = mongoose.model("__FKS__MODEL__", __FKS__MODEL__);
