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

/// <reference path="_references.ts"/>

module powerbi {
    import DataViewObjectDescriptors = powerbi.data.DataViewObjectDescriptors;
    import DataViewObjectDescriptor = powerbi.data.DataViewObjectDescriptor;
    import DisplayNameGetter = powerbi.data.DisplayNameGetter;
    import Selector = powerbi.data.Selector;
    import IStringResourceProvider = jsCommon.IStringResourceProvider;

    /**
     * Represents a visualization displayed within an application (PowerBI dashboards, ad-hoc reporting, etc.).
     * This interface does not make assumptions about the underlying JS/HTML constructs the visual uses to render itself.
     */
    export interface IVisual {
        /**
         * Initializes an instance of the IVisual.
         *
         * @param options: Initialization options for the visual.
         */
        init(options: VisualInitOptions): void;

        /** Notifies the visual that it is being destroyed, and to do any cleanup necessary (such as unsubscribing event handlers). */
        destroy?(): void;

        /** 
         * Notifies the IVisual of an update (data, viewmode, size change). 
         */
        update?(options: VisualUpdateOptions): void;

        /** 
         * Notifies the IVisual to resize.
         *
         * @param finalViewport: This is the viewport that the visual will eventually be resized to.
         */
        onResizing(finalViewport: IViewport): void;

        /** 
         * Notifies the IVisual of new data being provided.
         * This is an optional method that can be omitted if the visual is in charge of providing its own data. 
         */
        onDataChanged?(options: VisualDataChangedOptions): void;

        /** Notifies the IVisual of changes to the color, font, theme, and style related values that the visual should use. */
        onStyleChanged?(newStyle: IVisualStyle): void;

        /** Notifies the IVisual to change view mode if applicable. */
        onViewModeChanged?(viewMode: ViewMode): void;

        /** Notifies the IVisual to clear any selection. */
        onClearSelection?(): void;

        /** Notifies the IVisual to select the specified object. */
        onSelectObject?(object: VisualObjectInstance): void;

        /** Gets a value indicating whether the IVisual can be resized to the given viewport. */
        canResizeTo?(viewport: IViewport): boolean;

        /**
         * Gets the set of objects that the visual is currently displaying.
         *
         * @param objectName: Name of the object, as defined in the VisualCapabilities.
         */
        enumerateObjectInstances?(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[];
    }

    export interface IVisualPlugin {
        /** The name of the plugin.  Must match the property name in powerbi.visuals. */
        name: string;

        /** The key for the watermark style of this visual. Must match the id name in ExploreUI/views/svg/visualsWatermarks.svg */
        watermarkKey?: string;

        /** Declares the capabilities for this IVisualPlugin type. */
        capabilities?: VisualCapabilities;

        /** Function to call to create the visual. */
        create: IVisualFactoryMethod;

        /** 
          * Function to allow the visual to influence query generation. Called each time a query is generated
          * so the visual can translate its state into options understood by the query generator. 
          */
        customizeQuery?: CustomizeQueryMethod;

        /** The class of the plugin.  At the moment it is only used to have a way to indicate the class name that a custom visual has. */
        class?: string;

        /* Function to get the list of sortable roles */
        getSortableRoles?: (visualSortableOptions?: VisualSortableOptions) => string[];
    }

    /** Factory method for an IVisual.  This factory method should be registered on the powerbi.visuals object. */
    export interface IVisualFactoryMethod {
        (): IVisual;
    }

    /** Parameters available to a CustomizeQueryMethod */
    export interface CustomizeQueryOptions {
        /** 
         * The data view mapping for this visual with some additional information. CustomizeQueryMethod implementations
         * are expected to edit this in-place.
         */
        dataViewMappings: data.CompiledDataViewMapping[];
    }

    /** Parameters available to a sortable visual candidate */
    export interface VisualSortableOptions {
        /* The data view mapping for this visual with some additional information.*/
        dataViewMappings: data.CompiledDataViewMapping[];
    }

    /** An imperative way for a visual to influence query generation beyond just its declared capabilities. */
    export interface CustomizeQueryMethod {
        (options: CustomizeQueryOptions): void;
    }

    /** Defines the visual filtering capability for a particular filter kind. */
    export interface VisualFilterMapping {
        /** Specifies what data roles are used to control the filter semantics for this filter kind. */
        targetRoles: string[];
    }

    /**
     * Defines the visual filtering capabilities for various filter kinds.
       By default all visuals support attribute filters and measure filters in their innermost scope. 
    */
    export interface VisualFilterMappings {
        measureFilter?: VisualFilterMapping;
    }

    /** Defines the capabilities of an IVisual. */
    export interface VisualCapabilities {
        /** Defines what roles the visual expects, and how those roles should be populated.  This is useful for visual generation/editing. */
        dataRoles?: VisualDataRole[];

        /** Defines the set of objects supported by this IVisual. */
        objects?: DataViewObjectDescriptors;

        /** Defines how roles that the visual understands map to the DataView.  This is useful for query generation. */
        dataViewMappings?: DataViewMapping[];

        /** Defines how filters are understood by the visual. This is used by query generation */
        filterMappings?: VisualFilterMappings;
        
        /** Indicates whether cross-highlight is supported by the visual. This is useful for query generation. */
        supportsHighlight?: boolean;

        /** Indicates whether sorting is supported by the visual. This is useful for query generation */
        sorting?: VisualSortingCapabilities;

        /** Indicates whether a default title should be displayed.  Visuals with self-describing layout can omit this. */
        suppressDefaultTitle?: boolean;
    }

    /** Defines the data roles understood by the IVisual. */
    export interface VisualDataRole {
        /** Unique name for the VisualDataRole. */
        name: string;

        /** Indicates the kind of role.  This value is used to build user interfaces, such as a field well. */
        kind: VisualDataRoleKind;

        displayName?: DisplayNameGetter;

        /** Indicates the preferred ValueTypes to be used in this data role.  This is used by authoring tools when adding fields into the visual. */
        preferredTypes?: ValueTypeDescriptor[];
    }

    /** Defines the visual sorting capability. */
    export interface VisualSortingCapabilities {
        /** When specified, indicates that the IVisual wants default sorting behavior. */
        default?: {};

        /** When specified, indicates that the IVisual wants to control sort interactivity. */
        custom?: {};

        /** When specified, indicates sorting that is inherently implied by the IVisual.  This is useful to automatically sort. */
        implicit?: VisualImplicitSorting;
    }

    /** Defines implied sorting behaviour for an IVisual. */
    export interface VisualImplicitSorting {
        clauses: VisualImplicitSortingClause[];
    }

    export interface VisualImplicitSortingClause {
        role: string;
        direction: data.QuerySortDirection;
    }

    export const enum VisualDataRoleKind {
        /** Indicates that the role should be bound to something that evaluates to a grouping of values. */
        Grouping,
        /** Indicates that the role should be bound to something that evaluates to a single value in a scope. */
        Measure,
        /** Indicates that the role can be bound to either Grouping or Measure. */
        GroupingOrMeasure,
    }

    /** Defines the capabilities of an IVisual. */
    export interface VisualInitOptions {
        /** The DOM element the visual owns. */
        element: JQuery;

        /** The set of services provided by the visual hosting layer. */
        host: IVisualHostServices;

        /** Style information. */
        style: IVisualStyle;

        /** The initial viewport size. */
        viewport: IViewport;

        /** Animation options. */
        animation?: AnimationOptions;

        /** Interactivity options. */
        interactivity?: InteractivityOptions;
    }

    export interface VisualUpdateOptions {
        viewport: IViewport;
        dataViews: DataView[];
        suppressAnimations?: boolean;
        viewMode?: ViewMode;
    }

    export interface VisualDataChangedOptions {
        dataViews: DataView[];

        /** Optionally prevent animation transitions */
        suppressAnimations?: boolean;

        /** Indicates what type of update has been performed on the data.
        The default operation kind is Create.*/
        operationKind?: VisualDataChangeOperationKind;
    }

    export const enum VisualDataChangeOperationKind {
        Create = 0,
        Append = 1
    }

    export interface EnumerateVisualObjectInstancesOptions {
        objectName: string;
    }

    export interface CustomSortEventArgs {
        sortDescriptors: SortableFieldDescriptor[];
    }

    export interface SortableFieldDescriptor {
        queryName: string;
        sortDirection?: data.QuerySortDirection;
    }

    export const enum ViewMode {
        View = 0,
        Edit = 1,
    }

    export interface IVisualErrorMessage {
        message: string;
        title: string;
        detail: string;
    }

    export interface IVisualWarning {
        code: string;
        getMessages(resourceProvider: IStringResourceProvider): IVisualErrorMessage;
    }

    /** Defines behavior for IVisual interaction with the host environment. */
    export interface IVisualHostServices {
        /** Returns the localized form of a string. */
        getLocalizedString(stringId: string): string;

        /** Notifies of a DragStart event. */
        onDragStart(args: DragEventArgs): void;

        ///** Indicates whether the drag payload is compatible with the IVisual's data role.  This is useful when dropping to a particular drop area within the visual (e.g., dropping on a legend). */
        //canDropAs(payload: DragPayload, dataRole?: string): boolean;

        ///** Notifies of a Drop event. */
        //onDrop(args: DragEventArgs, dataRole?: string);

        /** Gets a value indicating whether the given selection is valid. */
        canSelect(args: SelectEventArgs): boolean;

        /** Notifies of a data point being selected. */
        onSelect(args: SelectEventArgs): void;  // TODO: Revisit onSelect vs. onSelectObject.

        /** Notifies of a visual object being selected. */
        onSelectObject?(args: SelectObjectEventArgs): void;  // TODO: make this mandatory, not optional.

        /** Notifies that properties of the IVisual have changed. */
        persistProperties(changes: VisualObjectInstance[]): void;

        ///** This information will be part of the query. */
        //onDataRangeChanged(range: {
        //    categorical: { // TODO: this structure is affected by the reduction algorithm as well as the data view type
        //        categories?: {
        //            /** Index of the category. */
        //            index: number;
        //            lower?: DataViewScopeIdentity;
        //            upper?: DataViewScopeIdentity;
        //        }[]
        //    }
        // });

        ///** Notifies of a drill down on the specified data point. */
        //onDrillDown(data: DataViewScopeIdentity): void;

        /** Requests more data to be loaded. */
        loadMoreData(): void;

        /** Notification to sort on the specified column */
        onCustomSort(args: CustomSortEventArgs): void;

        /** Indicates which view mode the host is in. */
        getViewMode(): ViewMode;

        /** Notify any warning that happened during update of the visual. */
        setWarnings(clientWarnings: IVisualWarning[]): void;

        /** Sets a toolbar on the host. */
        setToolbar($selector: JQuery): void;
    }

    export interface IViewport {
        height: number;
        width: number;
    }

    /** Animation options for visuals. */
    export interface AnimationOptions {
        /** Indicates whether all transition frames should be flushed immediately, effectively "disabling" any visual transitions. */
        transitionImmediate: boolean;
    }

    /** Interactivity options for visuals. */
    export interface InteractivityOptions {
        /** Indicates that dragging of data points should be permitted. */
        dragDataPoint?: boolean;

        /** Indicates that data points should be selectable. */
        selection?: boolean;

        /** Indicates that the chart and the legend are interactive */
        isInteractiveLegend?: boolean;

        /** Indicates overflow behavior. Values are CSS oveflow strings */
        overflow?: string;
    }

    export interface VisualDragPayload extends DragPayload {
        data?: Selector;
        field?: {};
    }

    export interface DragEventArgs {
        event: DragEvent;
        data: VisualDragPayload;
    }

    export interface SelectorForColumn {
        [queryName: string]: data.DataRepetitionSelector;
    }

    export interface SelectorsByColumn {
        /** Data-bound repetition selection. */
        dataMap?: SelectorForColumn;

        /** Metadata-bound repetition selection.  Refers to a DataViewMetadataColumn queryName. */
        metadata?: string;

        /** User-defined repetition selection. */
        id?: string;
    }

    // TODO: Consolidate these two into one object and add a method to transform SelectorsByColumn[] into Selector[] for components that need that structure
    export interface SelectEventArgs {
        data: Selector[];
        data2?: SelectorsByColumn[];
    }

    export interface SelectObjectEventArgs {
        object: DataViewObjectDescriptor;
    }

    export interface VisualObjectInstance {
        /** The name of the object (as defined in VisualCapabilities). */
        objectName: string;

        /** A display name for the object instance. */
        displayName?: string;

        /** The set of property values for this object.  Some of these properties may be defaults provided by the IVisual. */
        properties?: {
            [propertyName: string]: DataViewPropertyValue;
        };

        /** The selector that identifies this object. */
        selector: Selector;

        /** Defines the constrained set of valid values for a property. */
        validValues?: {
            [propertyName: string]: string[];
        };
    }
}
