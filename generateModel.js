export class ForeignKeyProcessor {
    constructor(mongoModel) {
        this.mongoModel = mongoModel;
    }

    processForeignKeys = async () => {
        const activeForeignKeys = await this._getActiveForeignKeys();
        this._populateForeignKeyMetadata(activeForeignKeys);
    };

    _getActiveForeignKeys = async () => {
        const schemaPaths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;
        const activeForeignKeys = {};

        await Promise.all(schemaPaths.map(([path]) => this._processPath(path, schemaEntries, activeForeignKeys)));
        return activeForeignKeys;
    };

    _processPath = async (path, schemaEntries, activeForeignKeys) => {
        const slicedKeys = path.split(".");
        const stack = [{ keys: slicedKeys, nested: [] }];
        let currentEntry = schemaEntries;

        while (stack.length > 0) {
            const { keys, nested } = stack.pop();
            currentEntry = this._getNextSchemaEntry(currentEntry, keys[0]);

            if (!currentEntry) continue;

            if (this._isLeafNode(keys)) {
                this._processLeafNode(path, currentEntry, activeForeignKeys);
            } else {
                this._addNestedKeyToStack(stack, keys, nested);
            }
        }
    };

    _getNextSchemaEntry = (currentEntry, key) => currentEntry[key];

    _isLeafNode = (keys) => keys.length === 1;

    _processLeafNode = (path, schemaField, activeForeignKeys) => {
        if (!schemaField.type) return;

        const { type, ref } = this._extractFieldTypeAndRef(schemaField);
        if (!ref) return;

        const metadata = this._createForeignKeyMetadata(path, schemaField, type.isArray);
        this._addForeignKeyMetadata(activeForeignKeys, ref, metadata);
    };

    _extractFieldTypeAndRef = (schemaField) => {
        const isArray = Array.isArray(schemaField.type);
        const type = isArray ? schemaField.type[0] : schemaField.type;
        const ref = type.schemaName === "ObjectId" ? schemaField.ref : null;
        return { type, ref, isArray };
    };

    _createForeignKeyMetadata = (path, schemaField, isArray) => ({
        path,
        required: schemaField.required || false,
        immutable: schemaField.immutable || false,
        unique: schemaField.unique || false,
        array: isArray,
    });

    _addForeignKeyMetadata = (activeForeignKeys, ref, metadata) => {
        if (!activeForeignKeys[ref]) {
            activeForeignKeys[ref] = [];
        }
        activeForeignKeys[ref].push(metadata);
    };

    _addNestedKeyToStack = (stack, keys, nested) => {
        stack.push({
            keys: keys.slice(1),
            nested: [...nested, keys[0]],
        });
    };

    _populateForeignKeyMetadata = (activeForeignKeys) => {
        if (Object.keys(activeForeignKeys).length > 0) {
            this.mongoModel._FKS = activeForeignKeys;
        }
    };
}
