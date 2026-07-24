import { listWarehouseNoPage } from '@/api/wms/warehouse';
import { listMerchantNoPage } from "@/api/wms/merchant";
import { listItemCategory, treeSelectItemCategory } from "@/api/wms/itemCategory";
import { listItemBrand } from "@/api/wms/itemBrand";
import { listItemMaterial } from "@/api/wms/itemMaterial";
import { listItemModel } from "@/api/wms/itemModel";
import {defineStore} from "pinia";
import {ref} from "vue";

const brandNameCollator = new Intl.Collator('en', { sensitivity: 'base' })

const sortItemBrands = (brands = []) => [...brands].sort((a, b) => {
  const nameA = String(a?.brandName || '').trim()
  const nameB = String(b?.brandName || '').trim()
  if (!nameA) return nameB ? 1 : 0
  if (!nameB) return -1
  return brandNameCollator.compare(nameA, nameB)
})

export const useWmsStore = defineStore('wms', () => {

  // 仓库管理
  const warehouseList = ref([]);
  const warehouseMap = ref(new Map());

  const getWarehouseList = () => {
    return listWarehouseNoPage({}).then((res) => {
      warehouseList.value = res.data;
      const map = new Map();
      warehouseList.value.forEach((supplier) => {
        map.set(supplier.id, supplier);
      });
      warehouseMap.value = map;
    });
  };

  // 企业管理
  const merchantList = ref([]);
  const merchantMap = ref(new Map());

  const getMerchantList = () => {
    return listMerchantNoPage({}).then((res) => {
      merchantList.value = res.data;
      const map = new Map();
      merchantList.value.forEach((supplier) => {
        map.set(supplier.id, supplier);
      });
      merchantMap.value = map;
    });
  }

  // 商品分类管理
  const itemCategoryList = ref([])
  const itemCategoryTreeList = ref([])
  const itemCategoryMap = ref(new Map())

  const getItemCategoryList = () => {
    return new Promise((resolve, reject) => {
      listItemCategory({}).then(res => {
        itemCategoryList.value = res.data;
        const map = new Map()
        itemCategoryList.value.forEach(supplier => {
          map.set(supplier.id, supplier)
        })
        itemCategoryMap.value = map
        resolve()
      }).catch(() => reject())
    })
  }

  const getItemCategoryTreeList = async () => {
    return new Promise((resolve, reject) => {
      treeSelectItemCategory().then(res => {
        itemCategoryTreeList.value = res.data
        resolve(res.data)
      }).catch(() => reject())
    })
  }

  // 商品品牌管理
  const itemBrandList = ref([])
  const itemBrandMap = ref(new Map())

  const getItemBrandList =  () => {
    return new Promise((resolve, reject) => {
      listItemBrand({}).then(res => {
        itemBrandList.value = sortItemBrands(res.data || [])
        const map = new Map()
        itemBrandList.value.forEach(supplier => {
          // 同时用原始 id 与字符串 key，避免雪花 ID 精度/类型不一致导致查不到名称
          map.set(supplier.id, { ...supplier })
          map.set(String(supplier.id), { ...supplier })
        })
        itemBrandMap.value = map
        resolve()
      }).catch(() => reject())
    })
  }

  const itemMaterialList = ref([])
  const itemMaterialMap = ref(new Map())

  const getItemMaterialList = () => {
    return new Promise((resolve, reject) => {
      listItemMaterial({ status: '1' }).then(res => {
        itemMaterialList.value = res.data || []
        const map = new Map()
        itemMaterialList.value.forEach(item => {
          map.set(item.id, { ...item })
        })
        itemMaterialMap.value = map
        resolve()
      }).catch(() => reject())
    })
  }

  const itemModelList = ref([])
  const itemModelMap = ref(new Map())

  const getItemModelList = () => {
    return new Promise((resolve, reject) => {
      listItemModel({ status: '1' }).then(res => {
        itemModelList.value = res.data || []
        const map = new Map()
        itemModelList.value.forEach(item => {
          map.set(item.id, { ...item })
        })
        itemModelMap.value = map
        resolve()
      }).catch(() => reject())
    })
  }

  return {
    // 仓库管理
    warehouseList,
    warehouseMap,
    getWarehouseList,
    // 企业管理
    merchantList,
    merchantMap,
    getMerchantList,
    // 商品分类管理
    itemCategoryList,
    itemCategoryTreeList,
    itemCategoryMap,
    getItemCategoryList,
    getItemCategoryTreeList,
    // 商品品牌管理
    itemBrandList,
    itemBrandMap,
    getItemBrandList,
    itemMaterialList,
    itemMaterialMap,
    getItemMaterialList,
    itemModelList,
    itemModelMap,
    getItemModelList
  };
});
