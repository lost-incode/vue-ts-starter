import {Prop} from "vue-property-decorator";
import {namespace} from "vuex-class/lib/bindings";
import {Component, UI, Watch} from "../app/ui";
import {ShowProgress} from "../platform/decorators/showProgress";
import {ClientInfo} from "../services/clientService";
import {PortfolioParams} from "../services/portfolioService";
import {Portfolio} from "../types/types";
import {ActionType} from "../vuex/actionType";
import {MutationType} from "../vuex/mutationType";
import {StoreType} from "../vuex/storeType";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-list-tile class="text-xs-center sidebar-list-item">
            <v-list-tile-content class="portfolio-content">
                <v-menu offset-y transition="slide-y-transition" class="portfolios-drop portfolios-menu">
                    <v-layout slot="activator" class="pa-0 w100pc" justify-center align-center row>
                        <span :class="['portfolio-switcher-icon', sideBarOpened ? '' : 'mx-3', isMobile ? 'mx-3' : '']"></span>
                        <div v-if="!sideBarOpened || isMobile" class="portfolios-inner-content">
                            <span class="w140 fs13 ellipsis">{{ selected.name }}</span>
                            <v-layout align-center class="portfolios-list-icons">
                                <i :class="selected.viewCurrency.toLowerCase()" title="Валюта"></i>
                                <i v-if="selected.access" class="public-portfolio-icon" title="Публичный"></i>
                                <i v-if="selected.professionalMode" class="professional-mode-icon" title="Профессиональный режим"></i>
                            </v-layout>
                        </div>
                        <div v-if="!sideBarOpened || isMobile" class="portfolios-arrow">
                            <v-icon>keyboard_arrow_down</v-icon>
                        </div>
                    </v-layout>

                    <v-list class="portfolios-list">
                        <v-list-tile v-for="(portfolio, index) in clientInfo.user.portfolios" class="portfolios-list-tile" :key="index"
                                     @click="onSelect(portfolio)">
                            <v-list-tile-title class="ellipsis">{{ portfolio.name }}</v-list-tile-title>
                            <v-layout align-center class="portfolios-list-icons">
                                <i :class="portfolio.viewCurrency.toLowerCase()" title="Валюта"></i>
                                <i v-if="portfolio.access" class="public-portfolio-icon" title="Публичный"></i>
                                <i v-if="portfolio.professionalMode" class="professional-mode-icon" title="Профессиональный режим"></i>
                            </v-layout>
                        </v-list-tile>
                    </v-list>
                </v-menu>
            </v-list-tile-content>

        </v-list-tile>
    `
})
export class PortfolioSwitcher extends UI {

    @MainStore.Getter
    private clientInfo: ClientInfo;
    @MainStore.Getter
    private portfolio: Portfolio;

    @MainStore.Action(MutationType.SET_CURRENT_PORTFOLIO)
    private setCurrentPortfolio: (id: number) => Promise<Portfolio>;

    @MainStore.Action(MutationType.SET_DEFAULT_PORTFOLIO)
    private setDefaultPortfolio: (id: number) => Promise<void>;

    @MainStore.Action(ActionType.LOAD_EVENTS)
    private loadEvents: (id: number) => Promise<void>;

    @Prop({default: false, required: false})
    private sideBarOpened: boolean;

    @Prop({default: false, required: false})
    private isMobile: boolean;

    private selected: PortfolioParams = null;

    async created(): Promise<void> {
        this.selected = this.getSelected();
    }

    @ShowProgress
    private async onSelect(selected: PortfolioParams): Promise<void> {
        await this.setDefaultPortfolio(selected.id);
        await this.setCurrentPortfolio(selected.id);
        // не вызываем обновление событий если уже находимся на странице Событий, так как там они загрузятся сами
        if (this.$route.name !== "events") {
            await this.loadEvents(selected.id);
        }
        this.selected = selected;
    }

    @Watch("clientInfo.user.portfolios", {deep: true})
    private onPortfoliosChange(): void {
        this.selected = this.getSelected();
    }

    private getSelected(): PortfolioParams {
        const currentPortfolioId = this.portfolio.id;
        const portfolio = this.clientInfo.user.portfolios.find(p => p.id === currentPortfolioId);
        if (!portfolio) {
            return this.clientInfo.user.portfolios[0];
        }
        return portfolio;
    }
}
