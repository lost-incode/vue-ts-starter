import Component from "vue-class-component";
import {Prop, Watch} from "vue-property-decorator";
import {UI} from "../app/ui";
import {Filters} from "../platform/filters/Filters";
import {DashboardBrick, DashboardData} from "../types/types";

@Component({
    // language=Vue
    template: `
        <v-card dark class="dashboard-card" v-bind:class="{ 'dashboard-border': !block.hasNotBorderLeft }">
            <v-card-title primary-title class="pb-2 dashboard-card-string">
                <div>{{ block.name }}</div>
            </v-card-title>
            <v-container fluid pl-3 pt-0>
                <v-layout row class="mx-0 py-2 dashboard-card-big-nums">
                    <div class="headline">
                        <span><b>{{ block.mainValue }}</b></span>
                    </div>
                </v-layout>
                <v-layout row class="mx-0 dashboard-card-small-nums">
                    <div>
                        <template v-if="block.isSummaryIncome">
                            <div class="dashboard-summary-income" :class="block.isSummaryIncome.isUpward ? 'arrow-up' : 'arrow-down'">
                                <div class="dashboard-summary-income-icon">
                                    <v-icon>{{ block.isSummaryIncome.isUpward ? 'arrow_upward' : 'arrow_downward' }}</v-icon>
                                </div>
                                <div class="dashboard-summary-income-text">
                                    {{ block.secondValue }}
                                </div>
                            </div>
                        </template>

                        <template v-else>
                            <span><b>{{ block.secondValue }}</b> </span>
                            <span>{{ block.secondValueDesc }}</span>
                        </template>
                    </div>
                </v-layout>
            </v-container>
        </v-card>
    `
})
export class DashboardBrickComponent extends UI {

    @Prop({required: true})
    private block: DashboardBrick;
}

@Component({
    // language=Vue
    template: `
        <v-container v-if="data" px-0 grid-list-md text-xs-center fluid>
            <v-layout class="dashboard-wrap px-4" row wrap>
                <v-flex xl3 lg3 md6 sm12 xs12>
                    <dashboard-brick-component :block="blocks[0]"></dashboard-brick-component>
                </v-flex>
                <v-flex xl3 lg3 md6 sm12 xs12 :align-content-start="true">
                    <dashboard-brick-component :block="blocks[1]"></dashboard-brick-component>
                </v-flex>
                <v-flex xl3 lg3 md6 sm12 xs12>
                    <dashboard-brick-component :block="blocks[2]"></dashboard-brick-component>
                </v-flex>
                <v-flex xl3 lg3 md6 sm12 xs12>
                    <dashboard-brick-component :block="blocks[3]"></dashboard-brick-component>
                </v-flex>
            </v-layout>
        </v-container>
    `,
    components: {DashboardBrickComponent}
})
export class Dashboard extends UI {

    @Prop({required: true})
    private data: DashboardData;

    private blocks: DashboardBrick[] = [];

    created(): void {
        this.fillBricks(this.data);
    }

    @Watch("data")
    private onBlockChange(newValue: DashboardData): void {
        this.fillBricks(newValue);
    }

    private fillBricks(newValue: DashboardData): void {
        this.blocks[0] = {
            name: "Суммарная стоимость",
            mainValue: Filters.formatMoneyAmount(newValue.currentCost, true),
            secondValue: Filters.formatMoneyAmount(newValue.currentCostInAlternativeCurrency, true),
            hasNotBorderLeft: true
        };
        this.blocks[1] = {
            name: "Суммарная прибыль",
            mainValue: Filters.formatMoneyAmount(newValue.profit, true),
            secondValue: newValue.percentProfit,
            isSummaryIncome: {
                isUpward: parseInt(newValue.percentProfit) > 0
            }
        };
        this.blocks[2] = {
            name: "Среднегодовая доходность",
            mainValue: newValue.yearYield,
            secondValueDesc: "без дивидендов и купонов",
            secondValue: newValue.yearYieldWithoutDividendsAndCoupons,
        };
        this.blocks[3] = {
            name: "Изменение за день",
            mainValue: Filters.formatMoneyAmount(newValue.dailyChanges, true),
            secondValue: Filters.formatNumber(newValue.dailyChangesPercent),
        };
    }
}
