export class ForeignKeyProcessor {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
        this.activeForeignKeys = {};
        this.relations = [];
    }

    processForeignKeys = async () => {
        await this._getActiveForeignKeys();
        await this._populateForeignKeyMetadata();
    };

    _getActiveForeignKeys = async () => {
        const schemaPaths = Object.entries(this.mongoModel.schema.paths);
        console.log(schemaPaths);
        const schemaEntries = this.mongoModel.schema.obj;

        await Promise.all(schemaPaths.map(([path, info]) => this._processPath(path, info, schemaEntries)));
    };

    _processPath = async (path, info, schemaEntries, ) => {
        if (info["caster"] && info["instance"] && info["caster"]["instance"] === "ObjectId" && info["$isMongooseArray"]) {
            throw new Error("Linkeds references does not accept be inside array, use type: [ObjectId] or unlink the reference");
        }

        const slicedKeys = path.split(".");
        const stack = [{ keys: slicedKeys, nested: [] }];
        let currentEntry = schemaEntries;
        let limit = 100;

        while (stack.length > 0) {
            limit--;
            if (limit < 1) throw new Error("Exceeded maximum iteration limit while processing path");

            const { keys, nested } = stack.pop();
            currentEntry = this._getNextSchemaEntry(currentEntry, keys[0]);

            if (!currentEntry) continue;

            if (this._isLeafNode(keys)) {
                await this._processLeafNode(path, currentEntry);
            } else {
                await this._addNestedKeyToStack(stack, keys, nested);
            }
        }
    };

    _getNextSchemaEntry = (currentEntry, key) => currentEntry[key];

    _isLeafNode = (keys) => keys.length === 1;

    _processLeafNode = async (path, schemaField, ) => {
        if (!schemaField.type) return;

        const { ref, isArray } = await this._extractFieldTypeAndRef(schemaField);
        if (!ref) return;

        const metadata = await this._createForeignKeyMetadata(path, schemaField, isArray);
        await this._addForeignKeyMetadata(ref, metadata);
    };

    _extractFieldTypeAndRef = async (schemaField) => {
        const isArray = Array.isArray(schemaField.type);
        const type = isArray ? schemaField.type[0] : schemaField.type;

        const linked = !("_linked" in schemaField && !schemaField["_linked"]);

        let ref = null; 
        if (type.schemaName === "ObjectId" && linked) {
            if (!schemaField["ref"]) throw new Error("Cant link without reference");

            ref = schemaField.ref;
        }

        return { type, ref, isArray };
    };

    _createForeignKeyMetadata = async (path, schemaField, isArray) => ({
        path,
        required: schemaField.required || false,
        immutable: schemaField.immutable || false,
        unique: schemaField.unique || false,
        array: isArray,
    });

    _addForeignKeyMetadata = async (ref, metadata) => {
        if (!this.activeForeignKeys[ref]) {
            this.activeForeignKeys[ref] = [];
            
            if (!this.relations.includes(ref)) {
                this.relations.push(ref);
            }
        }
        this.activeForeignKeys[ref].push(metadata);
    };

    _addNestedKeyToStack = async (stack, keys, nested) => {
        stack.push({
            keys: keys.slice(1),
            nested: [...nested, keys[0]],
        });
    };

    _populateForeignKeyMetadata = async () => {
        if (Object.keys(this.activeForeignKeys).length > 0) {
            this.mongoModel._FKS = this.activeForeignKeys;
        }

        const modelName = this.mongoModel.modelName;

        if (this.relations.length > 0) {
            this.relations.forEach(relation => {
                this.mongoD.addRelation(relation, modelName);
            });
        }
    };
}
