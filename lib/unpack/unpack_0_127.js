"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = require("../tools");
const formats_1 = require("../formats");
/**
 * Unpack fields 0-127 from an ISO 8583 encoded string into a JSON
 * @method unpack_0_127
 * @memberof module:Message-UnPackage
 */
function default_1(incoming, isoJSON, config) {
    if (Buffer.isBuffer(incoming)) {
        const mti = incoming.slice(0, 4).toString();
        isoJSON['0'] = mti;
        if (!this._checkMTI(mti)) {
            return tools_1.default.toErrorObject('failed to unpack at get mti');
        }
        let bitmapEnd;
        // Does data contain a secondary bitmap?
        const secondaryBitmap = this.hasSecondaryBitmap(incoming.slice(4, 8), config);
        if (secondaryBitmap === false)
            bitmapEnd = 12;
        else
            bitmapEnd = 20;
        if (config.bitmapEncoding === 'utf8')
            bitmapEnd = (bitmapEnd - 4) * 2 + 4;
        const slice = incoming.slice(4, bitmapEnd).toString(config.bitmapEncoding || 'hex');
        const bitmap = tools_1.default.getHex(slice).split('').map(Number);
        let thisBuff = incoming.slice(bitmapEnd, incoming.byteLength);
        for (let field = 2; field <= bitmap.length; field++) {
            if (bitmap[field - 1] === 1) {
                // format defined
                const this_format = this.formats[field] || formats_1.default[field];
                if (!config.custom127Encoding && field === 127) {
                    const get127Exts = this.unpack_127_1_63(thisBuff, isoJSON);
                    if (get127Exts.error) {
                        return get127Exts;
                    }
                    else {
                        isoJSON = get127Exts.json;
                        thisBuff = get127Exts.remSlice;
                        continue;
                    }
                }
                if (this_format) {
                    if (this_format.LenType === 'fixed') {
                        if (this_format.ContentType === 'b') {
                            isoJSON[field] = thisBuff.slice(0, this_format.MaxLen / 2).toString('hex');
                            thisBuff = thisBuff.slice(this_format.MaxLen / 2, thisBuff.byteLength);
                        }
                        else {
                            isoJSON[field] = thisBuff.slice(0, this_format.MaxLen).toString();
                            thisBuff = thisBuff.slice(this_format.MaxLen, thisBuff.byteLength);
                        }
                    }
                    else {
                        const thisLen = tools_1.default.getLenType(this_format.LenType);
                        if (!this_format.MaxLen)
                            return tools_1.default.toErrorObject(['max length not implemented for ', this_format.LenType, field]);
                        if (this.Msg[field] && this.Msg[field].length > this_format.MaxLen) {
                            return tools_1.default.toInvalidLengthErrorObject(field, this.Msg[field].length);
                        }
                        if (thisLen === 0) {
                            return tools_1.default.toErrorObject(['field ', field, ' format not implemented']);
                        }
                        else {
                            const lenBuff = thisBuff.subarray(0, thisLen);
                            const lenString = lenBuff.toString();
                            let len = Number(lenString);
                            if (isNaN(len)) { // with certain lengths you get NAN and readUIntBE seems to work in those cases, not sure why...
                                len = lenBuff.readUIntBE(0, thisLen);
                            }
                            thisBuff = thisBuff.subarray(thisLen, thisBuff.byteLength);
                            isoJSON[field] = thisBuff.subarray(0, len).toString(field === 127 ? config.custom127Encoding : (config.bitmapEncoding || 'hex'));
                            thisBuff = thisBuff.subarray(Number(len), thisBuff.byteLength);
                        }
                    }
                }
                else
                    return tools_1.default.toErrorObject(['field ', field, ' format not implemented']);
            }
        }
        return isoJSON;
    }
    else
        return tools_1.default.toErrorObject(['expecting buffer but got ', typeof incoming]);
}
exports.default = default_1;
;
