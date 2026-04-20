import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
<<<<<<< Updated upstream
import React from 'react' // 🌟 新增：引入 React
=======
>>>>>>> Stashed changes

export default defineConfig({
  name: 'default',
  title: 'miwang-cms',
<<<<<<< Updated upstream
  projectId: 'sow12t1i',
  dataset: 'production',

  // 🌟 终极杀手锏：利用 Sanity 官方 Layout API，将样式强行注入到 React 核心树中
  studio: {
    components: {
      layout: (props) => {
        return React.createElement(
          React.Fragment,
          null,
          React.createElement('style', null, `
            /* 1. 强行锁定所有左侧导航面板的宽度为 260px，没收弹性 */
            div[data-ui="Pane"]:not([data-testid="document-pane"]) {
              min-width: 260px !important;
              max-width: 260px !important;
              width: 260px !important;
              flex: 0 0 260px !important;
            }
            /* 2. 彻底解放最右侧的文档编辑器，让它占满剩余的所有屏幕 */
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
            
            S.divider(),

            ...S.documentTypeListItems().filter(
              (listItem) => !['student'].includes(listItem.getId() || '')
            ),
          ])
    }),
    visionTool()
  ],
=======

  projectId: 'sow12t1i',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],
>>>>>>> Stashed changes

  schema: {
    types: schemaTypes,
  },
})
