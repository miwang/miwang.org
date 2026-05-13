import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import React from 'react' // 🌟 必须引入 React 以支持布局组件注入

export default defineConfig({
  name: 'default',
  title: 'miwang-cms',
  projectId: 'sow12t1i',
  dataset: 'production',

  // 🌟 核心增强：保持你之前的界面布局优化，防止面板抖动
  studio: {
    components: {
      layout: (props) => {
        return React.createElement(
          React.Fragment,
          null,
          React.createElement('style', null, `
            /* 1. 强行锁定所有左侧导航面板的宽度为 260px */
            div[data-ui="Pane"]:not([data-testid="document-pane"]) {
              min-width: 260px !important;
              max-width: 260px !important;
              width: 260px !important;
              flex: 0 0 260px !important;
            }
            /* 2. 让最右侧的文档编辑器占满剩余的所有屏幕 */
            div[data-testid="document-pane"] {
              flex: 1 1 auto !important;
              max-width: none !important;
            }
          `),
          props.renderDefault(props)
        )
      }
    }
  },

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('内容管理面板')
          .id('root-list')
          .items([
            // 🌟 核心增强：恢复你之前写好的分班管理文件夹结构
            S.listItem()
              .title('👶 学生分班管理')
              .id('student-management')
              .child(
                S.list()
                  .title('班级档案夹')
                  .id('academic-classes-list')
                  .items([
                    // ====== 25-26 学年 ======
                    S.listItem().title('🐘 25-26 学年 - 大象班').id('e-25-26').child(S.documentList().id('ed-25-26').title('大象班 (25-26)').filter('_type == "student" && academicYear == "25-26" && className == "elephant"')),
                    S.listItem().title('🐯 25-26 学年 - 老虎班').id('t-25-26').child(S.documentList().id('td-25-26').title('老虎班 (25-26)').filter('_type == "student" && academicYear == "25-26" && className == "tiger"')),
                    S.divider(),
                    // ====== 26-27 学年 ======
                    S.listItem().title('🐘 26-27 学年 - 大象班').id('e-26-27').child(S.documentList().id('ed-26-27').title('大象班 (26-27)').filter('_type == "student" && academicYear == "26-27" && className == "elephant"')),
                    S.listItem().title('🐯 26-27 学年 - 老虎班').id('t-26-27').child(S.documentList().id('td-26-27').title('老虎班 (26-27)').filter('_type == "student" && academicYear == "26-27" && className == "tiger"')),
                    S.divider(),
                    // ====== 27-28 学年 ======
                    S.listItem().title('🐘 27-28 学年 - 大象班').id('e-27-28').child(S.documentList().id('ed-27-28').title('大象班 (27-28)').filter('_type == "student" && academicYear == "27-28" && className == "elephant"')),
                    S.listItem().title('🐯 27-28 学年 - 老虎班').id('t-27-28').child(S.documentList().id('td-27-28').title('老虎班 (27-28)').filter('_type == "student" && academicYear == "27-28" && className == "tiger"')),
                  ])
              ),

            S.listItem()
              .title('📞 家长联系方式 (私密)')
              .id('parent-contacts')
              .child(
                S.list()
                  .title('家长联系方式')
                  .id('parent-contacts-list')
                  .items([
                    S.listItem().title('⚠️ 待核对').id('pc-review').child(S.documentList().id('pcd-review').title('待核对记录').filter('_type == "parentContact" && needsReview == true')),
                    S.divider(),
                    S.listItem().title('🐘 25-26 大象班联系人').id('pc-e-25-26').child(S.documentList().id('pcd-e-25-26').title('大象班联系人 (25-26)').filter('_type == "parentContact" && academicYear == "25-26" && student->className == "elephant"')),
                    S.listItem().title('🐯 25-26 老虎班联系人').id('pc-t-25-26').child(S.documentList().id('pcd-t-25-26').title('老虎班联系人 (25-26)').filter('_type == "parentContact" && academicYear == "25-26" && student->className == "tiger"')),
                    S.divider(),
                    S.listItem().title('🐘 26-27 大象班联系人').id('pc-e-26-27').child(S.documentList().id('pcd-e-26-27').title('大象班联系人 (26-27)').filter('_type == "parentContact" && academicYear == "26-27" && student->className == "elephant"')),
                    S.listItem().title('🐯 26-27 老虎班联系人').id('pc-t-26-27').child(S.documentList().id('pcd-t-26-27').title('老虎班联系人 (26-27)').filter('_type == "parentContact" && academicYear == "26-27" && student->className == "tiger"')),
                  ])
              ),

            S.listItem()
              .title('🗓️ 当前学年设置')
              .id('academic-year-config')
              .child(
                S.document()
                  .schemaType('academicYearConfig')
                  .documentId('academic-year-config')
                  .title('当前学年设置')
              ),
            
            S.divider(),

            // 自动加载其余所有类型（绘本、儿歌、配置等），但排除掉已经在上面定义过的 student
            ...S.documentTypeListItems().filter(
              (listItem) => !['student', 'academicYearConfig', 'parentContact'].includes(listItem.getId() || '')
            ),
          ])
    }),
    visionTool()
  ],

  schema: {
    types: schemaTypes,
  },
})
