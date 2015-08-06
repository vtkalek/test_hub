﻿/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbitests {
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;
    var valueFormatter = powerbi.visuals.valueFormatter;
    
    describe("ValueFormatter",() => {
        var columnIntObjFormat: powerbi.DataViewMetadataColumn = { displayName: 'col', objects: { fmtObj: { fmtProp: 'R' } } };
        var columnIntObjFormatIdentitifer: powerbi.DataViewObjectPropertyIdentifier = { objectName: 'fmtObj', propertyName: 'fmtProp' };

        describe('format',() => {
            it("format null",() => {
                expect(valueFormatter.format(null)).toBe('(Blank)');
                expect(valueFormatter.formatRaw(null)).toBe('');
            });

            it("format empty",() => {
                expect(valueFormatter.format("")).toBe('');
                expect(valueFormatter.formatRaw("")).toBe('');
            });

            it("format non-null value",() => {
                var formatValue1 = valueFormatter.format(2010);
                var formatValue2 = valueFormatter.formatRaw(2010);
                expect(formatValue1).not.toBeNull();
                expect(formatValue2).not.toBeNull();
                expect(formatValue1).toBe(formatValue2);
            });

            it("format 100 pct",() => {
                expect(valueFormatter.format(1, '0.00 %;-0.00 %;0.00 %', true)).toBe('100%');
            });

            it("format 100 pct - no beautify",() => {
                expect(valueFormatter.format(1, '0.00 %;-0.00 %;0.00 %')).toBe('100.00 %');
            });

            it("format 100 pct - variation",() => {
                expect(valueFormatter.format(1, '0.0 %;-0.0 %;0.0 %', true)).toBe('100%');
            });

            it("format 52 pct - 4 decimals beautified",() => {
                // we only beautify the default format strings for percent
                expect(valueFormatter.format(0.52, '0.0000 %;-0.0000 %;0.0000 %', true)).toBe('52.0000 %');
            });

            it("format whole pct",() => {
                expect(valueFormatter.format(0.5, '0 %;-0 %;0 %', true)).toBe('50 %');
            });

            it("format Boolean",() => {
                expect(valueFormatter.format(true)).toBe('True');
                expect(valueFormatter.format(false)).toBe('False');
            });

            it("format Invalids",() => {
                expect(valueFormatter.format(Number.NaN)).toBe('NaN');
                expect(valueFormatter.format(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
                expect(valueFormatter.format(Number.POSITIVE_INFINITY)).toBe('+Infinity');
                var nullNumber: number = null;
                expect(valueFormatter.format(nullNumber)).toBe('(Blank)');
            });
        });

        describe('getFormatString',() => {
            it("getFormatString: column with custom object",() => {
                expect(valueFormatter.getFormatString(columnIntObjFormat, columnIntObjFormatIdentitifer)).toBe('R');
            });

            it("getFormatString: column with custom object (unspecified)",() => {
                expect(valueFormatter.getFormatString({ displayName: 'col' }, columnIntObjFormatIdentitifer)).toBeUndefined();
            });
        });

        describe('create',() => {
            it("create basic format with invalid values",() => {
                var scale = valueFormatter.create({ format: '0', value: 0 });

                expect(scale.format(Number.NaN)).toBe('NaN');
                expect(scale.format(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
                expect(scale.format(Number.POSITIVE_INFINITY)).toBe('+Infinity');
                var nullNumber = null;
                expect(scale.format(nullNumber)).toBe('(Blank)');
            });

            it("create non-null/null init",() => {
                var scale = valueFormatter.create({ format: '0', value: 1e6, value2: null });

                expect(scale.format(-2.4e6)).toBe('-2.4M');
            });

            it("create null/non-null init",() => {
                var scale = valueFormatter.create({ format: '0', value: null, value2: 1e6 });

                expect(scale.format(-2.4e6)).toBe('-2.4M');
            });

            it("create abs value init",() => {
                var scale = valueFormatter.create({ format: '0', value: -3e6, value2: 2 });

                expect(scale.format(-3e6)).toBe('-3M');
            });

            it("create Year",() => {
                var scale = valueFormatter.create({ format: 'd', value: new Date(2010, 1) });

                expect(scale.format(2010)).toBe('2010');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create No Scale",() => {
                var column: powerbi.DataViewMetadataColumn;
                var scale = valueFormatter.create({ column: column, value: 0 });

                expect(scale.format(0)).toBe('0');
                expect(scale.format(0.5678934)).toBe('0.5679');
                expect(scale.format(-0.5678934)).toBe('-0.5679');
                expect(scale.format(1.234e7)).toBe('12340000');
                expect(scale.format(1.12000000000007)).toBe('1.12');
            });

            it("create Million",() => {
                var column: powerbi.DataViewMetadataColumn;
                var scale = valueFormatter.create({ column: column, value: 1e6 });

                expect(scale.format(4.56e7)).toBe('45.6M');
                expect(scale.format(4.56789123e7)).toBe('45.68M');
                expect(scale.format(-3130000.567)).toBe('-3.13M');
                expect(scale.format(10000)).toBe('0.01M');
                expect(scale.format(100000)).toBe('0.1M');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create Billion",() => {
                var column: powerbi.DataViewMetadataColumn;
                var scale = valueFormatter.create({ column: column, value: 1e9 });

                expect(scale.format(4.56e10)).toBe('45.6bn');
                expect(scale.format(4.56789123e10)).toBe('45.68bn');
                expect(scale.format(-3130000000.567)).toBe('-3.13bn');
                expect(scale.format(100000000)).toBe('0.1bn');
                expect(scale.format(1000000000)).toBe('1bn');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create Trillion",() => {
                var column: powerbi.DataViewMetadataColumn;
                var scale = valueFormatter.create({ column: column, value: 1e12 });

                expect(scale.format(4.56e13)).toBe('45.6T');
                expect(scale.format(4.56789123e13)).toBe('45.68T');
                expect(scale.format(-3130000000000.567)).toBe('-3.13T');
                expect(scale.format(100000000000)).toBe('0.1T');
                expect(scale.format(1000000000000)).toBe('1T');
                expect(scale.format(1000000000000000)).toBe('1000T');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create Exponent format",() => {
                var scale = valueFormatter.create({ format: 'E', value: 1e15 });

                expect(scale.format(719200000000001920000000000)).toBe('7.192000E+026');
            });

            it("create Exponent format",() => {
                var column: powerbi.DataViewMetadataColumn;
                var scale = valueFormatter.create({ column: column, value: 1e15 });

                expect(scale.format(719200000000001920000000000)).toBe('7.192E+26');
            });

            it("create Percentage",() => {
                var format: string = '0.00 %;-0.00 %;0.00 %';
                var scale = valueFormatter.create({ format: format, value: 1, allowFormatBeautification: true });

                expect(scale.format(0)).toBe('0%');
                expect(scale.format(1)).toBe('100%');
                expect(scale.format(-1)).toBe('-100%');
                expect(scale.format(.54)).toBe('54%');
                expect(scale.format(.543)).toBe('54.3%');
                expect(scale.format(.5432)).toBe('54.32%');
                expect(scale.format(.54321)).toBe('54.32%');
                expect(scale.format(6.54321)).toBe('654.32%');
                expect(scale.format(76.54321)).toBe('7,654.32%');
            });

            it("create Escaped Character format",() => {
                var scale = valueFormatter.create({ format: "\\$#,0.00;(\\$#,0.00);\\$#,0.00", value: 1e6 });

                expect(scale.format(107384391.61)).toBe('$107.38M');
                expect(scale.format(-107384391.61)).toBe('($107.38M)');
            });

            it("create Format no custom negative",() => {
                var scale = valueFormatter.create({ format: "$#,0.00", value: 1e6 });

                expect(scale.format(-107384391.61)).toBe('-$107.38M');
            });

            it('create HundredThousand',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 300000 });

                expect(scale.format(300000)).toBe('0.3M');
            });

            it('create Million',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000 });

                expect(scale.format(900000000)).toBe('0.9bn');
            });

            it('create Billion',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000 });

                expect(scale.format(900000000000)).toBe('0.9T');
            });

            it('create Trillion',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.Default });

                expect(scale.format(900000000000000)).toBe('9E+14');
            });

            it('create HundredThousand Whole Units',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 300000, displayUnitSystemType: powerbi.DisplayUnitSystemType.WholeUnits });

                expect(scale.format(300000)).toBe('300K');
            });

            it('create Million Whole Units',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.WholeUnits });

                expect(scale.format(900000000)).toBe('900M');
            });

            it('create Billion Whole Units',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.WholeUnits });

                expect(scale.format(900000000000)).toBe('900bn');
            });

            it('create Trillion Whole Units',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.WholeUnits });

                expect(scale.format(900000000000000)).toBe('900T');
            });

            it('create HundredThousand Verbose (No Units)',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 300000, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose });

                expect(scale.format(300000)).toBe('300000');
            });

            it('create Million Verbose (No Units)',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose });

                expect(scale.format(900000000)).toBe('900000000');
            });

            it('create Billion Verbose (No Units)',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose });

                expect(scale.format(900000000000)).toBe('900000000000');
            });

            it('create Trillion Verbose (No Units)',() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 900000000000000, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose });

                expect(scale.format(900000000000000)).toBe('900000000000000');
            });

            it('create single value formatting verbose',() => {
                var format: string = '#,0.00';
                var scale = valueFormatter.create({ format: format, value: 26.254, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose, formatSingleValues: true });

                // Default formatting for numeric types is 2dp
                expect(scale.format(26.254)).toBe('26.25');
            });

            it('create single value formatting verbose large',() => {
                var format: string = '#,0.00';
                var scale = valueFormatter.create({ format: format, value: 300000.254, displayUnitSystemType: powerbi.DisplayUnitSystemType.Verbose, formatSingleValues: true });

                // Verbose formatting shouldn't use units
                expect(scale.format(300000.254)).toBe('300,000.25');
            });

            it('precision without display units',() => {
                var scale = valueFormatter.create({ value: 0, precision: 3 });

                expect(scale.format(12.1012)).toBe('12.101');
            });

            it('precision with display units',() => {
                var format: string = '#,0.00';
                var scale = valueFormatter.create({ format: format, value: 10000, precision: 2 });

                expect(scale.format(12177)).toBe('12.18K');
            });

            it('precision 1 with display units',() => {
                var format: string = '#,0.00';
                var scale = valueFormatter.create({ format: format, value: 10000, precision: 1 });

                expect(scale.format(12177)).toBe('12.2K');
            });

            it('precision with display units and no format string',() => {
                var scale = valueFormatter.create({ value: 10000, precision: 2 });
                expect(scale.format(12177)).toBe('12.18K');
            });

            it('Verify single value integer formatting for values less than 10K should not show display units',() => {
                var format: string = 'g';
                var input: number = 9999;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType  });

                expect(scale.format(input)).toBe('9999');
            });

            it('Verify single value integer formatting for numeric values less than 10K should show display units', () => {
                // NOTE: In this case the column type is Integer, but the value is actually numeric.
                var format: string = 'g';
                var input: number = 9999.12345;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType });

                expect(scale.format(input)).toBe('10K');
            });

            it('Verify single value number formatting with display units for values greater than 10K should show display units',() => {
                var format: string = 'g';
                var input: number = 10001;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType });

                expect(scale.format(input)).toBe('10K');
            });         

            it('Verify single value custom formatting with single decimal value should not show display units',() => {
                var format: string = '0';
                var input: number = 1999.2;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType });

                expect(scale.format(input)).toBe('1999');
            });

            it('Verify single value custom formatting with two decimal values should show display units',() => {
                var format: string = '0.00';
                var input: number = 1999.9;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType });

                expect(scale.format(input)).toBe('2K');
            });

            it('Verify single value number formatting for values less than 10K should show display units',() => {
                var format: string = 'g';
                var input: number = 1999.9;
                var columnType = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
                var scale = valueFormatter.create({ format: format, value: input, formatSingleValues: true, columnType: columnType });

                expect(scale.format(input)).toBe('2K');
            });

            it("create Boolean",() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: false, value2: true, tickCount: 6 });

                expect(scale.format(true)).toBe('True');
                expect(scale.format(false)).toBe('False');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create Boolean with numeric index values",() => {
                var format: string;
                var scale = valueFormatter.create({ format: format, value: 0, value2: 1, tickCount: 6 });

                expect(scale.format(true)).toBe('True');
                expect(scale.format(false)).toBe('False');
                expect(scale.format(null)).toBe('(Blank)');
            });

            it("create Date",() => {
                var format: string = 'O';
                var minDate = new Date(2014, 10, 4, 12, 34, 56, 789);
                var maxDate = new Date(2014, 10, 9, 12, 34, 56, 789);
                var scale = valueFormatter.create({ format: format, value: minDate, value2: maxDate, tickCount: 6 });

                expect(scale.format(minDate)).toBe('Nov 04');
                expect(scale.format(maxDate)).toBe('Nov 09');
                expect(scale.format(null)).toBe('(Blank)');
            });

        });

        describe('formatListAnd',() => {
            it('formatListAnd no values',() => {
                var result = valueFormatter.formatListAnd([]);
                expect(result).toBeNull();
            });

            it('formatListAnd 1 value',() => {
                var result = valueFormatter.formatListAnd(['1']);
                expect(result).toBe('1');
            });

            it('formatListAnd 2 values',() => {
                var result = valueFormatter.formatListAnd(['1', '2']);
                expect(result).toBe('1 and 2');
            });

            it('formatListAnd 3 values',() => {
                var result = valueFormatter.formatListAnd(['1', '2', '3']);
                expect(result).toBe('1, 2 and 3');
            });

            it('formatListAnd wrong parameters values',() => {
                var result = valueFormatter.formatListAnd(null);
                expect(result).toBeNull();

                var result = valueFormatter.formatListAnd(undefined);
                expect(result).toBeNull();
            });
        });

        describe('formatListOr',() => {
            it('formatListOr no values',() => {
                var result = valueFormatter.formatListOr([]);
                expect(result).toBeNull();
            });

            it('formatListOr 1 value',() => {
                var result = valueFormatter.formatListOr(['1']);
                expect(result).toBe('1');
            });

            it('formatListOr wrong parameters values',() => {
                var result = valueFormatter.formatListOr(null);
                expect(result).toBeNull();

                var result = valueFormatter.formatListOr(undefined);
                expect(result).toBeNull();
            });
        });

        it('getDisplayUnits',() => {
            var displayUnits = valueFormatter.getDisplayUnits(powerbi.DisplayUnitSystemType.Default);
            expect(displayUnits).toBeDefined();
            expect(displayUnits.length).toBeGreaterThan(0);
        });
    });
}