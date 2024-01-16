import { Component, OnInit, ViewChild } from '@angular/core'
//import { DatePipe } from '@angular/common'
import { ActivatedRoute, Router } from '@angular/router'
import { finalize } from 'rxjs'
import { TranslateService } from '@ngx-translate/core'

import { Action, ConfigurationService, PortalMessageService } from '@onecx/portal-integration-angular'
//import { limitText } from '../../shared/utils'
import { Product, ProductsAPIService, MicrofrontendsAPIService, GetProductRequestParams } from '../../generated'
import { environment } from '../../../environments/environment'
import { ProductPropertyComponent } from './product-props/product-props.component'

type ChangeMode = 'VIEW' | 'NEW' | 'EDIT'

@Component({
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  providers: [ConfigurationService]
})
export class ProductDetailComponent implements OnInit {
  @ViewChild(ProductPropertyComponent, { static: false }) productPropsComponent!: ProductPropertyComponent

  private apiPrefix = environment.apiPrefix
  public productName: string
  public product: Product | undefined
  //  usedInWorkspace: Workspace[] | undefined
  public changeMode: ChangeMode = 'NEW'
  public loading = false
  public dateFormat = 'medium'
  public actions: Action[] = []
  public headerImageUrl?: string
  public productDeleteVisible = false
  public productDeleteMessage = ''

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productApi: ProductsAPIService,
    private mfeApi: MicrofrontendsAPIService,
    private config: ConfigurationService,
    private msgService: PortalMessageService,
    private translate: TranslateService
  ) {
    this.dateFormat = this.config.lang === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'medium'
    this.productName = this.route.snapshot.paramMap.get('name') || ''
    if (this.productName !== '') {
      this.changeMode = 'VIEW'
      this.loadProduct()
    } else {
      this.product = undefined
      this.prepareTranslations()
    }
  }

  ngOnInit(): void {
    console.log('product detail ngOnInit()')
  }

  private loadProduct() {
    this.loading = true
    this.productApi
      .searchProducts({ productSearchCriteria: { name: this.productName } })
      .pipe(
        finalize(() => {
          this.loading = false
        })
      )
      .subscribe({
        next: (data: any) => {
          if (data.stream && data.stream.length > 0) {
            this.product = data.stream[0]
            console.info('search: ', data.stream[0])
            this.getProduct()
          }
          this.prepareTranslations()
        },
        error: (err: any) => {
          this.msgService.error({
            summaryKey: 'DIALOG.LOAD_ERROR',
            detailKey: err.error.indexOf('was not found') > 1 ? 'DIALOG.NOT_FOUND' : err.error
          })
          this.close()
        }
      })
  }
  private getProduct() {
    this.loading = true
    this.productApi
      .getProduct({ id: this.product?.id } as GetProductRequestParams)
      .pipe(
        finalize(() => {
          this.loading = false
        })
      )
      .subscribe({
        next: (data: any) => {
          if (data) {
            this.product = data
            console.info('get: ', data)
          }
          //this.usedInWorkspace = data.workspaces
          this.setHeaderImageUrl()
        }
      })
  }

  private prepareTranslations(): void {
    this.translate
      .get([
        'ACTIONS.DELETE.LABEL',
        'ACTIONS.DELETE.TOOLTIP',
        'ACTIONS.EDIT.LABEL',
        'ACTIONS.EDIT.TOOLTIP',
        'ACTIONS.CANCEL',
        'ACTIONS.TOOLTIPS.CANCEL',
        'ACTIONS.SAVE',
        'ACTIONS.TOOLTIPS.SAVE',
        'ACTIONS.NAVIGATION.CLOSE',
        'ACTIONS.NAVIGATION.CLOSE.TOOLTIP'
      ])
      .subscribe((data) => {
        this.prepareActionButtons(data)
      })
  }

  private prepareActionButtons(data: any): void {
    this.actions = [] // provoke change event
    this.actions.push(
      {
        label: data['ACTIONS.NAVIGATION.CLOSE'],
        title: data['ACTIONS.NAVIGATION.CLOSE.TOOLTIP'],
        actionCallback: () => this.close(),
        icon: 'pi pi-times',
        show: 'always',
        conditional: true,
        showCondition: this.changeMode === 'VIEW'
      },
      {
        label: data['ACTIONS.EDIT.LABEL'],
        title: data['ACTIONS.EDIT.TOOLTIP'],
        actionCallback: () => this.onEdit(),
        icon: 'pi pi-pencil',
        show: 'always',
        conditional: true,
        showCondition: this.changeMode === 'VIEW' && this.product !== undefined,
        permission: 'PRODUCT#EDIT'
      },
      {
        label: data['ACTIONS.CANCEL'],
        title: data['ACTIONS.TOOLTIPS.CANCEL'],
        actionCallback: () => this.onCancel(),
        icon: 'pi pi-pencil',
        show: 'always',
        conditional: true,
        showCondition: this.changeMode !== 'VIEW'
      },
      {
        label: data['ACTIONS.SAVE'],
        title: data['ACTIONS.TOOLTIPS.SAVE'],
        actionCallback: () => this.onSave(),
        icon: 'pi pi-pencil',
        show: 'always',
        conditional: true,
        showCondition: this.changeMode !== 'VIEW',
        permission: 'PRODUCT#EDIT'
      },
      {
        label: data['ACTIONS.DELETE.LABEL'],
        title: data['ACTIONS.DELETE.TOOLTIP'],
        actionCallback: () => {
          this.productDeleteMessage = data['ACTIONS.DELETE.MESSAGE'].replace('{{ITEM}}', this.product?.name)
          this.productDeleteVisible = true
        },
        icon: 'pi pi-trash',
        show: 'asOverflow',
        conditional: true,
        showCondition: this.changeMode === 'VIEW' && this.product !== undefined,
        permission: 'PRODUCT#DELETE'
      }
    )
  }

  private setHeaderImageUrl(): void {
    // img format is from BE or from Internet
    if (this.product?.imageUrl && !this.product.imageUrl.match(/^(http|https)/g)) {
      this.headerImageUrl = this.apiPrefix + this.product.imageUrl
    } else {
      this.headerImageUrl = this.product?.imageUrl
    }
  }

  private close(): void {
    this.router.navigate(['./..'], { relativeTo: this.route })
  }
  public onClose() {
    this.close()
  }
  private onEdit() {
    this.getProduct()
    this.changeMode = 'EDIT'
    this.prepareTranslations()
  }
  private onCancel() {
    if (this.changeMode === 'EDIT') {
      this.changeMode = 'VIEW'
      this.getProduct()
      this.prepareTranslations()
    }
    if (this.changeMode === 'NEW') {
      this.close()
    }
  }
  private onSave() {
    this.productPropsComponent.onSubmit()
  }
  public onCreate(data: any) {
    this.product = data
  }
  public onNameChange(change: boolean) {
    change ? this.close() : this.getProduct()
  }
}
