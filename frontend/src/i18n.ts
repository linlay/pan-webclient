import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGE_STORAGE_KEY } from "./static";

export type AppLanguage = "en" | "zh-CN";

export const supportedLanguages: Array<{
  code: AppLanguage;
  label: string;
  nativeLabel: string;
}> = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "zh-CN", label: "Chinese", nativeLabel: "中文" },
  ];

const resources = {
  en: {
    translation: {
      common: {
        appName: "Zenmind Pan",
        back: "Back",
        cancel: "Cancel",
        close: "Close",
        confirm: "Confirm",
        copy: "Copy",
        create: "Create",
        delete: "Delete",
        done: "Done",
        download: "Download",
        edit: "Edit",
        english: "English",
        file: "File",
        files: "Files",
        folder: "Folder",
        folders: "Folders",
        language: "Language",
        move: "Move",
        next: "Next",
        open: "Open",
        path: "Path",
        processing: "Processing...",
        refresh: "Refresh",
        rename: "Rename",
        save: "Save",
        saving: "Saving...",
        search: "Search",
        select: "Select",
        share: "Share",
        upload: "Upload",
        chinese: "中文",
        yes: "Yes",
        no: "No",
      },
      languageMenu: {
        buttonLabel: "Language menu",
      },
      app: {
        connectingWorkspace: "Connecting to your workspace...",
        hideSidebar: "Hide sidebar",
        resultsCount: "{{count}} results",
        showSidebar: "Show sidebar",
      },
      auth: {
        appModeMessage:
          "/apppan does not use password login. Please let the host app inject a Bearer token before opening this page.",
        emailOrUsername: "Email or Username",
        enterCredentials:
          "Enter your credentials to access Zenmind Pan",
        loginFailed: "Sign-in failed",
        password: "Password",
        signIn: "Sign In",
        signingIn: "Signing in...",
        welcomeBack: "Welcome back",
      },
      header: {
        darkMode: "Dark Mode",
        hideHiddenFiles: "Hide Hidden Files",
        lightMode: "Light Mode",
        logOut: "Log Out",
        searchFilesPlaceholder: "Search files, folders...",
        searchPlaceholder: "Search...",
        showHiddenFiles: "Show Hidden Files",
        systemTheme: "System Theme",
        userMenu: "User menu",
      },
      sidebar: {
        directoryTree: "Directory Tree",
        favorites: "Favorites",
        myShares: "My Shares",
        quickAccess: "Quick Access",
        storage: "Storage",
        tasks: "Tasks",
        trash: "Trash",
      },
      mobileFab: {
        uploadFile: "Upload File",
        newFolder: "New Folder",
      },
      toolbar: {
        newFolder: "New Folder",
        shareFolder: "Share Folder",
      },
      dialog: {
        archive: "Archive",
        createFolderDescription:
          "The folder will be created in the current directory.",
        createFolderTitle: "New Folder",
        copyDescription: "Enter the target directory path.",
        copyTitle: "Copy {{count}} items",
        dangerZone: "Danger Zone",
        deleteDescription:
          "Deleted items go to the trash and are not permanently removed immediately.",
        deleteTitle: "Delete {{count}} items",
        folderName: "Folder name",
        involvedItems: "Items involved",
        moveDescription: "Enter the target directory path.",
        moveTitle: "Move {{count}} items",
        newName: "New name",
        operation: "Operation",
        pickTargetDir:
          "Choose the target folder from the current workspace tree, or edit the path above directly.",
        renameDescription:
          "Only the name changes; the parent directory stays the same.",
        renameTitle: "Rename {{name}}",
        targetDirectory: "Target directory",
        targetLevel: "Target level",
        zipFileName: "ZIP file name",
        batchDownloadDescription:
          "The system will create an archive task in the background.",
        batchDownloadTitle: "Download {{count}} items",
        createTask: "Create Task",
      },
      editor: {
        charCount: "{{count}} chars",
        lineCount: "{{count}} lines",
        saveFailed: "Save failed",
        title: "Editor",
        empty: {
          multiTitle: "Bulk selection does not enter edit mode",
          multiDescription:
            "Narrow the selection to a single text or Markdown file before editing here.",
          dirTitle: "Folders cannot be edited directly",
          dirDescription:
            "Folders never enter edit mode; clicking a folder opens that level.",
          previewOnlyTitle:
            "This file is currently available for preview only",
          previewOnlyDescription:
            "Only text files and Markdown are supported for online editing at the moment.",
          idleTitle: "Select a text file to edit",
          idleDescription:
            "Supports plain text, Markdown, and other text types currently recognized by the backend.",
        },
      },
      files: {
        actions: "{{name}} actions",
        columns: {
          name: "Name",
          dateModified: "Date Modified",
          type: "Type",
          size: "Size",
        },
        directory: "Folder",
        emptyDescription:
          "Switch folders, clear the search, or upload files directly.",
        emptyTitle: "No items to display",
        itemsCount: "{{count}} items",
        selectedCount: "{{count}} selected",
      },
      preview: {
        closePreview: "Close preview",
        fileFolder: "Folder",
        location: "Location",
        modified: "Modified",
        mount: "Mount",
        noInlinePreviewTitle:
          "This file does not support embedded preview",
        noInlinePreviewDescription:
          "You can continue with download, open, or other file actions.",
        noMountSelected: "No mount selected",
        preview: "Preview",
        properties: "Properties",
        searching: 'Searching for "{{query}}"',
        selectToView: "Select an item to view details",
        selectedTitle: "{{count}} selected",
        selectedDescription:
          "Preview is not loaded automatically during multi-select. You can move, copy, delete, or batch-download directly.",
        tasksCount: "Tasks {{count}}",
        viewTasks: "View {{count}} tasks",
      },
      taskDelete: {
        delete: "Delete",
        deleting: "Deleting...",
        dialogTitle: "Delete task history",
        errorFallback: "Delete failed",
        removeArchive:
          "The generated download archive will be removed as well.",
        taskName: "Task name",
        undoWarning: "This cannot be undone.",
      },
      tasks: {
        back: "Back",
        deleteTask: "Delete task",
        downloadZip: "Download ZIP",
        empty: "No tasks yet",
        failed: "Failed",
        panelTitle: "Tasks",
        pending: "Pending",
        running: "Running",
        success: "Completed",
        summary: {
          upload: "Upload",
          zipArchive: "ZIP Archive",
          zipReady: "ZIP Ready",
          zipPacking: "ZIP Packaging",
          countSuffix: "{{count}} items",
        },
        detail: {
          preparingArchive: "Preparing archive",
          buildingArchive: "Building ZIP archive",
          uploadingOne: "Uploading {{name}}",
          uploadingMany: "Uploading {{count}} files",
        },
        footer: {
          transferComplete: "Transfer complete",
          sourceTotalSize: "Source total size {{size}}",
          zipReady: "ZIP ready",
        },
      },
      trash: {
        deletePermanently: "Delete permanently",
        empty: "Trash is empty",
        panelTitle: "Trash",
        restore: "Restore",
      },
      shares: {
        panelTitle: "My Shares",
        emptyTitle: "No shares created yet",
        emptyDescription:
          "Select a file or folder and use Share from the toolbar to create a short link.",
        copyLink: "Copy Link",
        revoking: "Revoking...",
        revokeShare: "Revoke Share",
        access: {
          password: "Password share",
          public: "Public share",
        },
        permission: {
          write: "Upload share",
          read: "Read-only share",
        },
        writeMode: {
          text: "Text input",
          local: "Local file",
        },
        entryType: {
          dir: "Folder",
          file: "File",
        },
        status: {
          expired: "Expired",
          active: "Active",
        },
        meta: {
          created: "Created",
          expiry: "Expiry",
          never: "Never expires",
        },
        passwordHintSaved:
          "The password will be included automatically when copying the link.",
        passwordHintMissing:
          "The password was not saved when this share was created, so only the link can be copied now.",
        dialog: {
          title: "Share {{name}}",
          dirDescription:
            "Create a short link for the current folder and choose read-only access or upload-only permission.",
          fileDescription:
            "Create a short link for the current file. Visitors can only access, save, and download this file.",
          createdTitle: "Share created",
          shareLink: "Share Link",
          password: "Password",
          copySuccess: "Share info copied",
          copyLink: "Copy Link",
          accessMode: "Access Mode",
          accessPasswordTitle: "Password share",
          accessPublicTitle: "Public share",
          accessPasswordDescription:
            "A 4-digit code is required before access.",
          accessPublicDescription:
            "Anyone with the link can browse the shared content.",
          permissionTitle: "Permission",
          permissionWriteTitle: "Upload share",
          permissionReadTitle: "Read-only share",
          permissionWriteDescription:
            "Visitors can upload files within the current folder and subfolders only. Download and save are disabled.",
          permissionReadDescription:
            "Visitors can browse, download, and save the shared content.",
          writeModeTitle: "Write Mode",
          writeModeText: "Text input (Markdown only)",
          writeModeLocal: "Local file upload",
          publicCardTitle: "Public share",
          publicCardDescription:
            "Anyone with the link can access it directly.",
          passwordCardTitle: "Password share",
          passwordCardDescription: "Auto-generate a 4-digit code.",
          dirPermissionTitle: "Folder permission",
          readCardTitle: "Read-only",
          readCardDescription: "Supports access, download, and save.",
          writeCardTitle: "Upload only",
          writeCardDescription:
            "Folder uploads only. No download or save.",
          fileReadOnlyNotice:
            "Single-file shares are always read-only and do not support upload permission.",
          localCardTitle: "Local files",
          localCardDescription:
            "Visitors can only upload files from their device.",
          textCardTitle: "Text input",
          textCardDescription:
            "Visitors can submit content and save it as `.md`.",
          descriptionTitle: "Description",
          descriptionDescription:
            "Optional. Shown on the upload share page for visitors and can be collapsed.",
          descriptionPlaceholder:
            "For example: please upload the quotation and include the company name in the filename.",
          expiryTitle: "Expiry",
          expiryDate: "Expiry date",
          create: "Create Share",
          creating: "Creating...",
        },
        expiry: {
          sevenDays: "7 days",
          sevenDaysDescription:
            "Good for short-lived temporary sharing",
          fourteenDays: "14 days",
          fourteenDaysDescription:
            "Good for collaboration materials",
          thirtyDays: "30 days",
          thirtyDaysDescription:
            "Recommended default duration",
          permanent: "Never expires",
          permanentDescription:
            "Valid until you manually remove the share",
          custom: "Custom date",
          customDescription:
            "Supports dates within the next 365 days",
        },
        saveDialog: {
          title: "Save to My Drive",
          description:
            "Copy the current shared content into one of your own mounted directories without expanding the share scope.",
          checkingSession:
            "Checking your session and loading available mounts...",
          authRequiredTitle: "Sign in required before saving",
          authRequiredDescription:
            "This share page is a public entry point. Saving into your own drive requires validating your signed-in session.",
          openLoginPage: "Open Login Page",
          currentItem: "Current Item",
          sharePath: "Shared path: {{path}}",
          saveToMount: "Save to mount",
          targetDirectory: "Target directory",
          targetDirectoryHelp:
            "You can type a path directly or choose one from the directory tree on the right.",
          targetDirectoryTree: "Target directory tree",
          noTargetDirectory: "No target directories available",
          saveToDrive: "Save to Drive",
          saveToDriveSaving: "Saving...",
        },
      },
      sharePage: {
        writePermission: "Write",
        readPermission: "Read-only",
        writeShare: "Upload share",
        readShare: "Read-only share",
        loadingTitle: "Loading shared content",
        errorTitle: "Unable to access this share",
        passwordShareEyebrow: "Password Share",
        passwordProtectedTitle: "This share is password-protected",
        passwordPrompt: "Password",
        passwordValidating: "Validating...",
        enterShare: "Enter Share",
        expireAt: "Expires at: {{value}}",
        passwordGate: {
          textWrite:
            "Enter the 4-digit code to access the current folder and submit Markdown text.",
          localWritePrefix:
            "Enter the 4-digit code to access folder ",
          localWriteSuffix: " and upload files.",
          readOnly:
            "Enter the 4-digit code to browse and download the shared file or folder.",
          protectedShareName: "Protected Share",
          currentFolder: "current folder",
        },
        header: {
          expiresAt: "Expires at {{value}}",
          never: "Never expires",
          downloadCurrentDirectory: "Download current folder",
          downloadCurrentFile: "Download current file",
        },
        content: {
          directoryNoPropertiesTitle:
            "Folders do not show Properties here",
          directoryNoPropertiesDescription:
            "Select a single file on the left to view its properties, preview, and downloadable content.",
          uploadedList: "Uploads",
          uploadedCount: "{{count}} entries",
          noUploadedFiles: "No files uploaded successfully in this session yet",
          currentDirectoryEmpty: "Current folder is empty",
          currentDirectory: "Current folder",
          upOneLevel: "Up one level",
          singleFileShare: "This is a single-file share",
          singleFileMobileHint:
            "Use the button above to download or save it. File details are shown separately.",
          singleFileDesktopHint:
            "You can preview or download the file directly on the right.",
          quickNoteTitle: "Save a .md file to this folder",
          fileName: "File name",
          fileNamePlaceholder: "Leave empty to use {{name}} by default",
          body: "Content",
          bodyPlaceholder: "Enter the Markdown content to save.",
          saveMarkdownToFolder: "Save {{name}} to this folder",
          saveMarkdown: "Save Markdown to this folder",
          localFileTitle: "Upload local files to this folder",
          multiFile: "Multiple files supported",
          autoSaveAfterUpload: "Auto-save after upload",
          releaseToUpload: "Release to upload now",
          dragFilesHere: "Drag files here",
          chooseFilesHelp:
            "You can also click the button below to choose local files.",
          chooseFilesToUpload: "Choose files to upload",
          dragUpload: "Drag and drop upload",
          batchSelection: "Batch selection supported",
          uploadAutoPrompt:
            "Automatic prompt after upload completes",
        },
        notices: {
          linkCopied: "Link copied",
          uploadedMany: "{{count}} files uploaded",
          uploadedOne: "{{name}} uploaded",
          savedAs: "{{name}} saved",
          writeShareNoPreview:
            "Upload shares do not support file preview or download",
          savedToMount: "Saved to {{mount}}{{path}}",
          savedEntry: "{{name}} saved",
        },
        errors: {
          shareLoadFailed: "Failed to load share",
          directoryLoadFailed: "Failed to load folder",
          filePreviewFailed: "Failed to preview file",
          passwordValidationFailed: "Password validation failed",
          uploadFailed: "Upload failed",
          textSaveFailed: "Failed to save text",
        },
      },
      controller: {
        inspector: {
          tasks: "Tasks",
          shares: "My Shares",
          trash: "Trash",
        },
        errors: {
          appModeToken:
            "App mode requires the host to inject an access token.",
          loadDirectoryFailed:
            "Failed to load the directory. Please check whether the mounted directory exists.",
          loadPreviewFailed: "Failed to load preview",
          selectOneRename: "Select one item to rename.",
          selectEntriesFirst: "Please select a file or folder first.",
          crossMountBatch:
            "Bulk operations do not support cross-mount selection.",
          selectDeleteFirst: "Please select items to delete first.",
          crossMountDelete:
            "Delete operations do not support cross-mount selection.",
          selectDownloadFirst:
            "Please select items to download first.",
          crossMountDownload:
            "Batch download does not support cross-mount selection.",
          selectShareFirst:
            "Please select a file or folder to share.",
          shareCurrentDirUnsupported:
            "The current folder cannot be shared directly.",
          enterFolderName: "Please enter a folder name.",
          noMountAvailable: "No mount is currently available.",
          enterNewName: "Please enter a new name.",
          enterTargetDir: "Please enter a target directory.",
          operationFailed: "Operation failed",
          uploadFailed: "Upload failed",
          deleteFailed: "Delete failed",
        },
        info: {
          loginSuccess: "Signed in successfully",
          shareCopied: "Share link copied",
          shareCopiedWithPassword:
            "Share link and password copied",
          shareCopiedWithoutPassword:
            "Share link copied. The password was not stored when this share was created.",
          shareRevoked: "Share revoked",
          folderCreated: "{{name}} created",
          renameSuccess: "Renamed successfully",
          moveComplete: "Move complete",
          copyComplete: "Copy complete",
          movedToTrash: "Moved to trash",
          downloadTaskCreated: "Download task created",
          taskDeleted: "Task deleted",
          saveSuccess: "Saved successfully",
          restoreSuccess: "Restored to the original location",
          deletePermanentSuccess: "Deleted permanently",
        },
        copyText: {
          linkOnly: "Link: {{link}}",
          linkWithPassword: "Link: {{link}}\nPassword: {{password}}",
        },
        restoreFailed: "Restore failed: {{items}}",
        deletePermanentFailed: "Delete failed: {{items}}",
      },
      shareUtils: {
        customDateInvalid: "The custom expiry date is invalid.",
        customDateRequired: "Please choose a custom expiry date.",
        neverExpires: "This share never expires",
        expiresAt: "This share expires at {{value}}",
      },
      uploadLimits: {
        totalSizeExceeded:
          "Total upload size cannot exceed {{size}} in a single upload.",
      },
      formatters: {
        uploadedBytes: "Uploaded {{value}}",
        uploading: "Uploading...",
        uploadingProgress: "Uploading {{value}}%",
      },
    },
  },
  "zh-CN": {
    translation: {
      common: {
        appName: "Zenmind Pan",
        back: "返回",
        cancel: "取消",
        close: "关闭",
        confirm: "确认",
        copy: "复制",
        create: "创建",
        delete: "删除",
        done: "完成",
        download: "下载",
        edit: "编辑",
        english: "English",
        file: "文件",
        files: "文件",
        folder: "目录",
        folders: "目录",
        language: "语言",
        move: "移动",
        next: "下一步",
        open: "打开",
        path: "路径",
        processing: "处理中...",
        refresh: "刷新",
        rename: "重命名",
        save: "保存",
        saving: "保存中...",
        search: "搜索",
        select: "选择",
        share: "分享",
        upload: "上传",
        chinese: "中文",
        yes: "是",
        no: "否",
      },
      languageMenu: {
        buttonLabel: "语言菜单",
      },
      app: {
        connectingWorkspace: "正在连接你的工作区...",
        hideSidebar: "隐藏侧边栏",
        resultsCount: "{{count}} 条结果",
        showSidebar: "显示侧边栏",
      },
      auth: {
        appModeMessage:
          "/apppan 入口不使用密码登录。请由宿主 App 注入 Bearer Token 后再访问当前页面。",
        emailOrUsername: "邮箱或用户名",
        enterCredentials: "输入账户密码登录 Zenmind Pan",
        loginFailed: "登录失败",
        password: "密码",
        signIn: "登录",
        signingIn: "登录中...",
        welcomeBack: "欢迎回来",
      },
      header: {
        darkMode: "深色模式",
        hideHiddenFiles: "隐藏隐藏文件",
        lightMode: "浅色模式",
        logOut: "退出登录",
        searchFilesPlaceholder: "搜索文件、目录...",
        searchPlaceholder: "搜索...",
        showHiddenFiles: "显示隐藏文件",
        systemTheme: "跟随系统",
        userMenu: "用户菜单",
      },
      sidebar: {
        directoryTree: "目录树",
        favorites: "快捷入口",
        myShares: "我的分享",
        quickAccess: "快速访问",
        storage: "存储",
        tasks: "任务",
        trash: "垃圾桶",
      },
      mobileFab: {
        uploadFile: "上传文件",
        newFolder: "新建目录",
      },
      toolbar: {
        newFolder: "新建目录",
        shareFolder: "分享当前目录",
      },
      dialog: {
        archive: "压缩包",
        createFolderDescription: "目录会创建在当前工作目录下。",
        createFolderTitle: "新建目录",
        copyDescription: "输入目标目录路径。",
        copyTitle: "复制 {{count}} 个项目",
        dangerZone: "危险操作",
        deleteDescription:
          "删除会进入垃圾桶，不会直接执行不可恢复删除。",
        deleteTitle: "删除 {{count}} 个项目",
        folderName: "目录名称",
        involvedItems: "涉及项目",
        moveDescription: "输入目标目录路径。",
        moveTitle: "移动 {{count}} 个项目",
        newName: "新名称",
        operation: "操作",
        pickTargetDir:
          "从当前工作区目录树中选择目标目录，也可以直接修改上方路径。",
        renameDescription: "仅修改名称，不改变所在目录。",
        renameTitle: "重命名 {{name}}",
        targetDirectory: "目标目录",
        targetLevel: "目标层级",
        zipFileName: "ZIP 文件名",
        batchDownloadDescription:
          "系统会在后台创建压缩包任务。",
        batchDownloadTitle: "批量下载 {{count}} 个项目",
        createTask: "创建任务",
      },
      editor: {
        charCount: "{{count}} 字符",
        lineCount: "{{count}} 行",
        saveFailed: "保存失败",
        title: "编辑器",
        empty: {
          multiTitle: "批量选择不进入编辑模式",
          multiDescription:
            "先收敛到单个文本或 Markdown 文件，再在这里修改内容。",
          dirTitle: "目录不可直接编辑",
          dirDescription:
            "目录不会进入编辑状态；单击目录会直接进入该层级。",
          previewOnlyTitle: "该文件当前仅支持预览",
          previewOnlyDescription:
            "现阶段只支持文本类文件和 Markdown 的在线编辑。",
          idleTitle: "选择文本文件进入编辑",
          idleDescription:
            "支持纯文本、Markdown，以及后端当前已识别的其它文本类型。",
        },
      },
      files: {
        actions: "{{name}} 操作",
        columns: {
          name: "名称",
          dateModified: "修改时间",
          type: "类型",
          size: "大小",
        },
        directory: "目录",
        emptyDescription:
          "可以切换目录、清空搜索条件，或直接上传文件。",
        emptyTitle: "当前没有可展示的项目",
        itemsCount: "{{count}} 项",
        selectedCount: "已选 {{count}} 项",
      },
      preview: {
        closePreview: "关闭预览",
        fileFolder: "文件夹",
        location: "位置",
        modified: "修改时间",
        mount: "挂载点",
        noInlinePreviewTitle: "当前文件不支持内嵌预览",
        noInlinePreviewDescription:
          "可以使用下载、打开或其他文件操作继续处理。",
        noMountSelected: "未选择挂载点",
        preview: "预览",
        properties: "属性",
        searching: '当前正在搜索 "{{query}}"',
        selectToView: "选择一个项目查看详情",
        selectedTitle: "已选 {{count}} 项",
        selectedDescription:
          "批量选择时不会自动加载预览。可以直接执行移动、复制、删除或批量下载操作。",
        tasksCount: "任务 {{count}}",
        viewTasks: "查看 {{count}} 个任务",
      },
      taskDelete: {
        delete: "删除",
        deleting: "删除中...",
        dialogTitle: "删除任务记录",
        errorFallback: "删除失败",
        removeArchive: "同时会删除已生成的下载压缩包。",
        taskName: "任务名称",
        undoWarning: "此操作不可撤销。",
      },
      tasks: {
        back: "返回",
        deleteTask: "删除任务",
        downloadZip: "下载 ZIP",
        empty: "暂无任务",
        failed: "失败",
        panelTitle: "传输任务",
        pending: "等待中",
        running: "进行中",
        success: "已完成",
        summary: {
          upload: "上传",
          zipArchive: "ZIP 压缩包",
          zipReady: "ZIP 已生成",
          zipPacking: "ZIP 打包",
          countSuffix: "{{count}} 个项目",
        },
        detail: {
          preparingArchive: "正在准备打包",
          buildingArchive: "正在生成 ZIP",
          uploadingOne: "正在上传 {{name}}",
          uploadingMany: "正在上传 {{count}} 个文件",
        },
        footer: {
          transferComplete: "传输完成",
          sourceTotalSize: "源文件总大小 {{size}}",
          zipReady: "ZIP 已生成",
        },
      },
      trash: {
        deletePermanently: "彻底删除",
        empty: "垃圾桶为空",
        panelTitle: "垃圾桶",
        restore: "恢复",
      },
      shares: {
        panelTitle: "我的分享",
        emptyTitle: "还没有创建过分享",
        emptyDescription:
          "选中文件或目录后，点击工具栏里的分享即可生成短链。",
        copyLink: "复制链接",
        revoking: "取消中...",
        revokeShare: "取消分享",
        access: {
          password: "密码分享",
          public: "公开分享",
        },
        permission: {
          write: "写入分享",
          read: "只读分享",
        },
        writeMode: {
          text: "文本输入",
          local: "本地文件",
        },
        entryType: {
          dir: "目录",
          file: "文件",
        },
        status: {
          expired: "已过期",
          active: "生效中",
        },
        meta: {
          created: "创建",
          expiry: "有效期",
          never: "永久有效",
        },
        passwordHintSaved: "复制链接时会自动附带提取码。",
        passwordHintMissing:
          "当前分享创建时未保存提取码，复制时仅包含链接。",
        dialog: {
          title: "分享 {{name}}",
          dirDescription:
            "为当前目录生成短链，并选择只读访问或目录写入权限。",
          fileDescription:
            "为当前文件生成短链，访问者只能访问、保存和下载当前文件。",
          createdTitle: "分享已创建",
          shareLink: "分享链接",
          password: "提取码",
          copySuccess: "已复制分享信息",
          copyLink: "复制链接",
          accessMode: "访问方式",
          accessPasswordTitle: "密码分享",
          accessPublicTitle: "公开分享",
          accessPasswordDescription: "查看前需要输入 4 位提取码。",
          accessPublicDescription:
            "访问链接即可浏览当前分享内容。",
          permissionTitle: "分享权限",
          permissionWriteTitle: "写入分享",
          permissionReadTitle: "只读分享",
          permissionWriteDescription:
            "访问者只能在当前目录及子目录内上传文件，不提供下载和转存。",
          permissionReadDescription:
            "访问者可浏览、下载并保存当前分享内容。",
          writeModeTitle: "写入方式",
          writeModeText: "文本输入（仅 Markdown）",
          writeModeLocal: "本地文件上传",
          publicCardTitle: "公开分享",
          publicCardDescription: "拿到链接即可直接访问",
          passwordCardTitle: "密码分享",
          passwordCardDescription: "系统自动生成 4 位提取码",
          dirPermissionTitle: "目录权限",
          readCardTitle: "只读分享",
          readCardDescription: "支持访问、下载和保存",
          writeCardTitle: "写入分享",
          writeCardDescription:
            "仅开放目录上传，不提供下载和转存",
          fileReadOnlyNotice:
            "单文件分享固定为只读模式，不支持写入权限。",
          localCardTitle: "本地文件",
          localCardDescription:
            "访问者只能选择本地文件上传",
          textCardTitle: "文本输入",
          textCardDescription:
            "访问者直接填写内容，保存为 `.md`",
          descriptionTitle: "描述说明",
          descriptionDescription:
            "可选。用于在写入分享页展示给访问者，可折叠查看。",
          descriptionPlaceholder:
            "例如：请上传报价单，并在文件名中附带公司名。",
          expiryTitle: "有效期设置",
          expiryDate: "到期日期",
          create: "创建分享",
          creating: "创建中...",
        },
        expiry: {
          sevenDays: "7 天内有效",
          sevenDaysDescription: "适合短期临时分享",
          fourteenDays: "14 天内有效",
          fourteenDaysDescription: "适合协作资料",
          thirtyDays: "30 天内有效",
          thirtyDaysDescription: "默认推荐时长",
          permanent: "永久有效",
          permanentDescription:
            "直到手动删除分享记录",
          custom: "自定义日期",
          customDescription:
            "最多支持 365 天内日期",
        },
        saveDialog: {
          title: "保存到我的网盘",
          description:
            "把当前分享内容复制到你自己的挂载目录，不会扩大分享访问范围。",
          checkingSession:
            "正在检查登录状态并加载可用挂载点...",
          authRequiredTitle: "需要先登录后才能保存",
          authRequiredDescription:
            "当前分享页是公开访问入口，保存到自己的网盘时会额外校验你的登录会话。",
          openLoginPage: "打开登录页",
          currentItem: "当前保存项",
          sharePath: "分享路径：{{path}}",
          saveToMount: "保存到挂载点",
          targetDirectory: "目标目录",
          targetDirectoryHelp:
            "可以直接输入路径，也可以从右侧目录树中选择。",
          targetDirectoryTree: "目标目录树",
          noTargetDirectory: "暂无可选目标目录",
          saveToDrive: "保存到网盘",
          saveToDriveSaving: "保存中...",
        },
      },
      sharePage: {
        writePermission: "写入",
        readPermission: "只读",
        writeShare: "写入分享",
        readShare: "只读分享",
        loadingTitle: "正在载入分享内容",
        errorTitle: "无法访问此分享",
        passwordShareEyebrow: "密码分享",
        passwordProtectedTitle: "此分享已受密码保护",
        passwordPrompt: "提取码",
        passwordValidating: "验证中...",
        enterShare: "进入分享",
        expireAt: "到期时间：{{value}}",
        passwordGate: {
          textWrite:
            "输入 4 位提取码后，才能进入当前目录并提交 Markdown 文本。",
          localWritePrefix:
            "输入 4 位提取码后，才能进入目录 ",
          localWriteSuffix: " 并上传文件。",
          readOnly:
            "输入 4 位提取码后，才能浏览和下载被分享的文件或目录。",
          protectedShareName: "受保护的分享",
          currentFolder: "当前目录",
        },
        header: {
          expiresAt: "到期于 {{value}}",
          never: "永久有效",
          downloadCurrentDirectory: "下载当前目录",
          downloadCurrentFile: "下载当前文件",
        },
        content: {
          directoryNoPropertiesTitle: "目录不展示 Properties",
          directoryNoPropertiesDescription:
            "请选择左侧单个文件查看属性、预览和下载内容。",
          uploadedList: "上传列表",
          uploadedCount: "{{count}} 条",
          noUploadedFiles:
            "当前会话还没有上传成功的文件",
          currentDirectoryEmpty: "当前目录为空",
          currentDirectory: "当前目录",
          upOneLevel: "返回上一级",
          singleFileShare: "这是一个单文件分享",
          singleFileMobileHint:
            "点击上方按钮可下载或保存，文件详情会单独展示。",
          singleFileDesktopHint:
            "右侧可以直接预览或下载文件内容。",
          quickNoteTitle: "快速保存.md文件到当前目录",
          fileName: "文件名",
          fileNamePlaceholder:
            "留空默认使用 {{name}}",
          body: "主体信息",
          bodyPlaceholder:
            "输入要保存的 Markdown 内容。",
          saveMarkdownToFolder:
            "保存 {{name}} 到当前目录",
          saveMarkdown: "保存 Markdown 到当前目录",
          localFileTitle: "上传本地文件到当前目录",
          multiFile: "支持多文件",
          autoSaveAfterUpload: "上传后自动保存",
          releaseToUpload: "松开鼠标，立即上传",
          dragFilesHere: "拖拽文件到这里",
          chooseFilesHelp:
            "也可以点击下方按钮选择本地文件。",
          chooseFilesToUpload: "选择本地文件上传",
          dragUpload: "拖拽上传",
          batchSelection: "支持批量选择",
          uploadAutoPrompt: "上传完成后自动提示",
        },
        notices: {
          linkCopied: "链接已复制",
          uploadedMany: "已上传 {{count}} 个文件",
          uploadedOne: "已上传 {{name}}",
          savedAs: "已保存 {{name}}",
          writeShareNoPreview:
            "写入分享不支持文件预览或下载",
          savedToMount: "已保存到 {{mount}}{{path}}",
          savedEntry: "已保存 {{name}}",
        },
        errors: {
          shareLoadFailed: "分享加载失败",
          directoryLoadFailed: "目录加载失败",
          filePreviewFailed: "文件预览失败",
          passwordValidationFailed: "密码校验失败",
          uploadFailed: "上传失败",
          textSaveFailed: "文本保存失败",
        },
      },
      controller: {
        inspector: {
          tasks: "任务",
          shares: "我的分享",
          trash: "垃圾桶",
        },
        errors: {
          appModeToken:
            "App 模式需要宿主注入访问令牌。",
          loadDirectoryFailed:
            "加载目录失败，请检查挂载目录是否存在。",
          loadPreviewFailed: "加载预览失败",
          selectOneRename: "请选择一个项目重命名。",
          selectEntriesFirst: "请先选择文件或目录。",
          crossMountBatch: "批量操作暂不支持跨挂载点选择。",
          selectDeleteFirst: "请先选择要删除的项目。",
          crossMountDelete:
            "删除操作暂不支持跨挂载点选择。",
          selectDownloadFirst:
            "请先选择要下载的项目。",
          crossMountDownload:
            "批量下载暂不支持跨挂载点选择。",
          selectShareFirst:
            "请选择一个文件或目录进行分享。",
          shareCurrentDirUnsupported:
            "当前目录暂不支持直接分享。",
          enterFolderName: "请输入目录名称。",
          noMountAvailable: "当前没有可用挂载点。",
          enterNewName: "请输入新的名称。",
          enterTargetDir: "请输入目标目录。",
          operationFailed: "操作失败",
          uploadFailed: "上传失败",
          deleteFailed: "删除失败",
        },
        info: {
          loginSuccess: "登录成功",
          shareCopied: "分享链接已复制",
          shareCopiedWithPassword:
            "分享链接和提取码已复制",
          shareCopiedWithoutPassword:
            "分享链接已复制，当前分享创建时未保存提取码。",
          shareRevoked: "已取消分享",
          folderCreated: "已创建 {{name}}",
          renameSuccess: "重命名成功",
          moveComplete: "移动完成",
          copyComplete: "复制完成",
          movedToTrash: "已移入垃圾桶",
          downloadTaskCreated: "已创建下载任务",
          taskDeleted: "任务已删除",
          saveSuccess: "保存成功",
          restoreSuccess: "已恢复到原位置",
          deletePermanentSuccess: "已彻底删除",
        },
        copyText: {
          linkOnly: "链接：{{link}}",
          linkWithPassword: "链接：{{link}}\n提取码：{{password}}",
        },
        restoreFailed: "恢复失败：{{items}}",
        deletePermanentFailed: "删除失败：{{items}}",
      },
      shareUtils: {
        customDateInvalid: "自定义到期日期无效。",
        customDateRequired: "请选择自定义到期日期。",
        neverExpires: "当前分享永久有效",
        expiresAt: "当前分享将于 {{value}} 到期",
      },
      uploadLimits: {
        totalSizeExceeded:
          "单次上传总大小不能超过 {{size}}。",
      },
      formatters: {
        uploadedBytes: "已上传 {{value}}",
        uploading: "上传中...",
        uploadingProgress: "上传中 {{value}}%",
      },
    },
  },
} as const;

function normalizeLanguage(value?: string | null): AppLanguage {
  if (value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

function readStoredLanguage(): AppLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : null;
}

function detectInitialLanguage(): AppLanguage {
  if (typeof navigator === "undefined") {
    return "zh-CN";
  }
  return normalizeLanguage(navigator.language);
}

const initialLanguage = readStoredLanguage() ?? detectInitialLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: supportedLanguages.map((item) => item.code),
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export function setAppLanguage(language: string) {
  const next = normalizeLanguage(language);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }
  return i18n.changeLanguage(next);
}

export function getCurrentLanguage(): AppLanguage {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
}

export function getDateLocale(language: string = getCurrentLanguage()) {
  return normalizeLanguage(language) === "zh-CN" ? "zh-CN" : "en-US";
}

export function translate(
  key: string,
  options?: Record<string, unknown>,
): string {
  return i18n.t(key, options) as string;
}

export default i18n;
