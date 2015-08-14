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

/// <reference path="../../_references.ts"/>

module powerbitests {
    import DataRoleHelper = powerbi.visuals.DataRoleHelper;
    import DataViewTransform = powerbi.data.DataViewTransform;

    describe("dataRoleHelper tests", () => {
        var dataViewBuilder: DataViewBuilder;

        beforeEach(() => {
            dataViewBuilder = new DataViewBuilder();

            dataViewBuilder.categoriesValues = ["Montana", "California", "Arizona"];
            dataViewBuilder.values = [
                [-100, 200, 700],
                [1, 2, 3],
                [4, 5, 6]
            ];
        });

        it("getMeasureIndexOfRole with roles validation", () => {
            dataViewBuilder.columns = [
                {displayName: "col1"},
                {displayName: "col2", isMeasure: true, roles: {"Size": true}},
                {displayName: "col3", isMeasure: true, roles: {"X": true}},
                {displayName: "col4", isMeasure: true, roles: {"Y": true}}
            ];

            var dataView: powerbi.DataView = dataViewBuilder.build();

            var grouped = dataView.categorical.values.grouped();

            var result = DataRoleHelper.getMeasureIndexOfRole(grouped, "InvalidRoleName");
            expect(result).toBe(-1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
            expect(result).toBe(0);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "X");
            expect(result).toBe(1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Y");
            expect(result).toBe(2);
        });

        it("getMeasureIndexOfRole without roles validation", () => {
            dataViewBuilder.columns = [
                { displayName: "col1" },
                { displayName: "col2", isMeasure: true },
                { displayName: "col3", isMeasure: true },
                { displayName: "col4", isMeasure: true }
            ];

            var dataView: powerbi.DataView = dataViewBuilder.build();

            var grouped = dataView.categorical.values.grouped();

            var result = DataRoleHelper.getMeasureIndexOfRole(grouped, "InvalidRoleName");
            expect(result).toBe(-1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
            expect(result).toBe(-1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "X");
            expect(result).toBe(-1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Y");
            expect(result).toBe(-1);
        });

        it("getMeasureIndexOfRole without roles validation with default", () => {
            dataViewBuilder.columns = [
                {displayName: "col1"},
                {displayName: "col2", isMeasure: true},
                {displayName: "col3", isMeasure: true},
                {displayName: "col4", isMeasure: true}
            ];

            var dataView: powerbi.DataView = dataViewBuilder.build();

            var grouped = dataView.categorical.values.grouped();

            var result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
            expect(result).toBe(-1);
        });

        it("getMeasureIndexOfRole without roles validation with default too few measures", () => {
            dataViewBuilder.values = [[-1, 2, 3]];

            dataViewBuilder.columns = [
                {displayName: "col1"},
                {displayName: "col2", isMeasure: true}
            ];

            var dataView: powerbi.DataView = dataViewBuilder.build();

            var grouped = dataView.categorical.values.grouped();

            var result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "2nd measure");
            expect(result).toBe(-1);
        });

        it("hasRoleInDataView", () => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: "col1", roles: { "Series": true } },
                    { displayName: "col2", isMeasure: true, roles: { "Size": true } },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(DataRoleHelper.hasRoleInDataView(dataView, "Series")).toBe(true);
            expect(DataRoleHelper.hasRoleInDataView(dataView, "Category")).toBe(false);
        });
    });

    class DataViewBuilder {
        private _categoriesValues: any[] = [];

        public get categoriesValues(): any[] {
            return this._categoriesValues;
        }

        public set categoriesValues(value: any[]) {
            this._categoriesValues = value;
        }

        private _values: any[] = [];

        public get values(): any[] {
            return this._values;
        }

        public set values(value: any[]) {
            this._values = value;
        }

        private _dataViewMetadata;

        public get dataViewMetadata() {
            return this._dataViewMetadata;
        }

        private _columns: any[] = [];

        public get columns(): any[] {
            return this._columns;
        }

        public set columns(value: any[]) {
            this._columns = value;
            this.updateCategoricalValues();
            this.createDataViewMetadata();
        }

        private createDataViewMetadata() {
            this._dataViewMetadata = {
                columns: this.columns
            };
        }

        private categoricalValues: any[] = [];

        private updateCategoricalValues() {
            var categoricalValues: any[] = [];

            for (var i = 1; i < this.columns.length && (i - 1) < this.values.length; i++) {
                var categoricalValue = this.values[i - 1];
                categoricalValue.source = this.columns[i];

                categoricalValues.push(categoricalValue);
            }

            this.categoricalValues = categoricalValues;
        }

        public build(): powerbi.DataView {
            return {
                metadata: this.dataViewMetadata,
                categorical: {
                    categories: [{
                        source: this.dataViewMetadata.columns[0],
                        values: this.categoriesValues
                    }],
                    values: DataViewTransform.createValueColumns(this.categoricalValues)
                }
            };
        }
    }
}