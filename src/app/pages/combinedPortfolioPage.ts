import {Container, Inject} from "typescript-ioc";
import {ContentLoader} from "vue-content-loader";
import {Route} from "vue-router";
import {namespace} from "vuex-class/lib/bindings";
import {Resolver} from "../../../typings/vue";
import {Component, UI} from "../app/ui";
import {BlockByTariffDialog} from "../components/dialogs/blockByTariffDialog";
import {CompositePortfolioManagement} from "../components/dialogs/compositePortfolioManagement";
import {ShowProgress} from "../platform/decorators/showProgress";
import {ClientInfo, ClientService} from "../services/clientService";
import {OverviewService} from "../services/overviewService";
import {HighStockEventsGroup} from "../types/charts/types";
import {Permission} from "../types/permission";
import {StoreKeys} from "../types/storeKeys";
import {ForbiddenCode, Overview} from "../types/types";
import {UiStateHelper} from "../utils/uiStateHelper";
import {StoreType} from "../vuex/storeType";
import {BasePortfolioPage} from "./basePortfolioPage";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <div>
            <v-slide-x-reverse-transition>
                <template v-if="overview">
                    <base-portfolio-page :overview="overview" :line-chart-data="lineChartData" :line-chart-events="lineChartEvents"
                                         :view-currency="viewCurrency" :state-key-prefix="StoreKeys.PORTFOLIO_COMBINED_CHART" :side-bar-opened="sideBarOpened"
                                         @reloadLineChart="loadPortfolioLineChart">
                        <template #afterDashboard>
                            <v-layout align-center>
                                <div :class="['control-porfolios-title', !isEmpty ? 'pl-3' : '']">
                                    Управление составным портфелем
                                </div>
                                <v-spacer></v-spacer>
                                <div v-if="isEmpty">
                                    <v-btn class="btn" color="primary" @click.stop="showDialogCompositePortfolio">
                                        Сформировать
                                    </v-btn>
                                </div>
                            </v-layout>
                            <v-layout v-if="!isEmpty" column class="empty-station px-4 py-4 mt-3">
                                <div class="empty-station__description">
                                    Здесь вы можете объединить для просмотра несколько портфелей в один, и проанализировать
                                    состав и доли каждой акции, если, например, она входит в состав нескольких портфелей.
                                </div>
                                <div class="mt-4">
                                    <v-btn class="btn" color="primary" @click.stop="showDialogCompositePortfolio">
                                        Сформировать
                                    </v-btn>
                                </div>
                            </v-layout>
                        </template>
                    </base-portfolio-page>
                </template>
                <template v-else>
                    <content-loader :height="800" :width="800" :speed="1" primaryColor="#f3f3f3" secondaryColor="#ecebeb">
                        <rect x="0" y="20" rx="5" ry="5" width="801.11" height="80"/>
                        <rect x="0" y="120" rx="5" ry="5" width="801.11" height="30"/>
                        <rect x="0" y="170" rx="5" ry="5" width="801.11" height="180"/>
                        <rect x="0" y="370" rx="5" ry="5" width="801.11" height="180"/>
                        <rect x="0" y="570" rx="5" ry="5" width="801.11" height="180"/>
                    </content-loader>
                </template>
            </v-slide-x-reverse-transition>
        </div>
    `,
    components: {BasePortfolioPage, ContentLoader}
})
export class CombinedPortfolioPage extends UI {

    @MainStore.Getter
    private clientInfo: ClientInfo;
    @MainStore.Getter
    private sideBarOpened: boolean;
    @Inject
    private overviewService: OverviewService;
    /** Данные комбинированного портфеля */
    private overview: Overview = null;
    /** Валюта просмотра портфеля */
    private viewCurrency: string = "RUB";
    /** Данные графика стоимости портфеля */
    private lineChartData: any[] = null;
    /** Данные по событиям для графика стоимости */
    private lineChartEvents: HighStockEventsGroup[] = null;
    /** Ключи для сохранения информации */
    private StoreKeys = StoreKeys;
    /** Конфиг отображения пустого состояния */
    private isEmpty: boolean = true;

    /**
     * Инициализация данных компонента
     * @inheritDoc
     */
    async created(): Promise<void> {
        await this.doCombinedPortfolio();
    }

    /**
     * Осуществляет проверку доступа к разделу
     * @param {Route} to      целевой объект Route, к которому осуществляется переход.
     * @param {Route} from    текущий путь, с которого осуществляется переход к новому.
     * @param {Resolver} next функция, вызов которой разрешает хук.
     * @inheritDoc
     * @returns {Promise<void>}
     */
    async beforeRouteEnter(to: Route, from: Route, next: Resolver): Promise<void> {
        const clientService: ClientService = Container.get(ClientService);
        const clientInfo = await clientService.getClientInfo();
        if (!clientInfo.tariff.hasPermission(Permission.COMBINED_PORTFOLIO)) {
            await new BlockByTariffDialog().show(ForbiddenCode.PERMISSION_DENIED);
            next(false);
            return;
        }
        next();
    }

    private async showDialogCompositePortfolio(): Promise<void> {
        const result = await new CompositePortfolioManagement().show({portfolio: this.clientInfo.user.portfolios, viewCurrency: this.viewCurrency});
        if (result) {
            this.viewCurrency = result;
            this.doCombinedPortfolio();
        }
    }

    private async doCombinedPortfolio(): Promise<void> {
        this.overview = null;
        const ids = this.clientInfo.user.portfolios.filter(value => value.combined).map(value => value.id);
        this.overview = await this.overviewService.getPortfolioOverviewCombined({ids: ids, viewCurrency: this.viewCurrency});
        if (ids.length) {
            await this.loadPortfolioLineChart();
        }
        this.checkForEmpty();
    }

    private checkForEmpty(): void {
        this.overview.bondPortfolio.rows.length === 0 && this.overview.stockPortfolio.rows.length === 0 ? this.isEmpty = false : this.isEmpty = true;
    }

    private async onPortfolioLineChartPanelStateChanges(): Promise<void> {
        await this.loadPortfolioLineChart();
    }

    private async loadPortfolioLineChart(): Promise<void> {
        const ids = this.clientInfo.user.portfolios.filter(value => value.combined).map(value => value.id);
        if (UiStateHelper.historyPanel[0] === 1) {
            this.lineChartData = await this.overviewService.getCostChartCombined({ids: ids, viewCurrency: this.viewCurrency});
            this.lineChartEvents = await this.overviewService.getEventsChartDataCombined({ids: ids, viewCurrency: this.viewCurrency});
        }
    }
}
