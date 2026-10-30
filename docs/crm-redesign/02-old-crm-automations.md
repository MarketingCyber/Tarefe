# Old CRM — all active automations, step by step (read-only export from Dynamics 365, 2026-10-30)

Generated from the process definitions; see 01-old-crm-map.md for the overview. "custom code X: Y" = a step written in C# inside the CRM (plugin assembly X, class Y).

## none (110)

### Action_Call_Generate_Letter_AutoChild
*Action* · `Action_Call_Generate_Letter_AutoChild`
- create **new_generate_letter** (new_contract_number, new_customer, new_customer_number, new_firstname, new_kontor_number, new_lastname, new_phonenumber, new_street, new_trace_code, new_pelak, new_evb, new_postalcode, new_other, new_city, new_email, new_accountref, new_accountname, new_letter, new_accountstreet, new_accountpelak, new_accountpostalcode, new_accountcity, new_name)
- custom code action: new_Action_Call_Generate_Letter
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **email** (new_emailaddress, subject, new_style, description, new_secondbody, new_send_method, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, prioritycode, scheduledend, scheduledstart, transactioncurrencyid)
- custom code Tarefe: Tarefe.Note.Note_Copy
- run «Send Email To Site»

### Action_Fulmakht_Report
*Action* · `Action_Fulmakht_Report`
- create **bsfulm_fulmakht** (bsfulm_customer, bsfulm_firstname, bsfulm_sign01, bsfulm_fullname, bsfulm_sign02, bsfulm_sign03, bsfulm_phone, bsfulm_sign04, bsfulm_email, bsfulm_sign05, bsfulm_street, bsfulm_postalcode, bsfulm_city)
- custom code BayatSoft.MSCRM: BayatSoft.MSCRM.MyDateTime.StringToDateTime
- if: Check If has Birthday
- update **bsfulm_fulmakht**: bsfulm_birthday
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Check_Has_Contact_By_Email_Phone
- update **bsfulm_fulmakht**: bsfulm_customer
- create **contact** (mobilephone, birthdate, emailaddress1, new_strasse, new_plz, new_stadt, new_motherllanguage, statuscode, address2_addresstypecode, address2_freighttermscode, address2_shippingmethodcode, creditonhold, customersizecode, customertypecode, donotbulkemail, donotbulkpostalmail, donotemail, donotfax, donotphone, donotpostalmail, donotsendmm, educationcode, firstname, followemail, haschildrencode, isbackofficecustomer, lastname, leadsourcecode, marketingonly, preferredappointmenttimecode, preferredcontactmethodcode, shippingmethodcode, territorycode, transactioncurrencyid)
- update **bsfulm_fulmakht**: bsfulm_customer
- run «Fulmakht_Fill_Contact_Info»
- custom code TB_Report: Tarefe.Letter.FulmakhtReportAsPdf
- custom code TarefeBusiness2: Tarefe.Contact.GetEntityNameAndId
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendNoteFileAndTakeFileUrl

### Action_Return_Contact_Id
*Action* · `Action_Return_Contact_Id`

### Action_Vollmacht_Report
*Action* · `Action_Vollmacht_Report`
- custom code TB_Report: TB_Report.Letter.VollmachtReportAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendNoteFileAndTakeFileUrl

### AddSuggestedCards
*Action — manual/on demand* · `AddSuggestedCards`

### AlmHandler
*Action* · `AlmHandler`

### AnalyzeSentiment
*Action* · `AnalyzeSentiment`

### CategorizeText
*Action* · `CategorizeText`

### CheckAnyUserIsIntegrationUser
*Action* · `CheckAnyUserIsIntegrationUser`

### CheckFetchXmlAndLayoutXmlOfSavedQueries
*Action* · `CheckFetchXmlAndLayoutXmlOfSavedQueries`

### CheckIfSalesFormsFromUnmanagedLayer
*Action* · `CheckIfSalesFormsFromUnmanagedLayer`

### CheckOrgSettingIsSOPIntegrationEnabled
*Action* · `CheckOrgSettingIsSOPIntegrationEnabled`

### CheckOrgSettingOOBPriceCalculationEnabled
*Action* · `CheckOrgSettingOOBPriceCalculationEnabled`

### CheckReqRibbonCommandDef
*Action* · `CheckReqRibbonCommandDef`

### CheckReqWebResourceOnSystemForm
*Action* · `CheckReqWebResourceOnSystemForm`

### CloneRoutingRuleSet
*Action* · `CloneRoutingRuleSet`

### Convert legacy xml to fetchxml format and vice versa
*Action* · `ConditionXmlConversion`

### CreateSuggestedActivity
*Action* · `CreateSuggestedActivity`

### CreateSuggestedContact
*Action* · `CreateSuggestedContact`

### DeleteCalendar
*Action* · `DeleteCalendar`

### DetectLanguage
*Action* · `DetectLanguage`

### Dismiss EmailInfra based ActionCards
*Action* · `DismissEmailInfraActionCard`

### DismissSuggestedActivity
*Action* · `DismissSuggestedActivity`

### DismissSuggestedContact
*Action* · `DismissSuggestedContact`

### EditAndSaveSuggestedContact
*Action* · `EditAndSaveSuggestedContact`

### Enable Data Validation
*Action* · `EnableLinkedInDataValidation`

### Enable SharePoint
*Action, real-time* · `EnableSharePoint`
> This will enable sharepoint on server

### Evaluate rule and route for any entity
*Action* · `EvaluateRuleAndRoute`

### Evaluate Search request and provide available slots
*Action* · `EvaluateSearchRequest`

### ExecuteARC
*Action* · `ExecuteARC`

### ExecutePrimaryCreatePostActions
*Action* · `ExecutePrimaryCreatePostActions`

### ExtractKeyPhrases
*Action* · `ExtractKeyPhrases`

### ExtractTextEntities
*Action* · `ExtractTextEntities`

### For Internal Use only. Performs Data Validation API operations.
*Action* · `DataValidationApi`

### Get FCB Status
*Action* · `SIGetFCBStatus`

### Get Knowledge article suggestions
*Action* · `RetrieveKnowledgeSuggestions`

### Get RICommon FCB Status
*Action* · `GetRICommonFCBStatus`

### Get Search providers for federated search feature
*Action* · `RetrieveSearchProviders`

### GetAutoCaptureUri
*Action* · `GetAutoCaptureUri`

### GetJobStatus
*Action* · `GetJobStatus`

### GetKAObjectFromTemplate
*Action* · `GetKAObjectFromTemplate`

### GetOrganizationProvisioningStatus
*Action* · `GetOrganizationProvisioningStatus`

### GetRecordUsers
*Action* · `GetRecordUsers`
> Gets users associated with record

### GetServiceTreeData
*Action* · `GetServiceTreeData`

### GetTimeLineRecords
*Action* · `GetTimeLineRecords`

### GetUserConsentStatus
*Action* · `GetUserConsentStatus`

### InvokeServiceStoredProc
*Action* · `InvokeServiceStoredProc`

### IsMSTeamsUserSyncFeatureEnabled
*Action* · `IsMSTeamsUserSyncFeatureEnabled`
> Checks if user sync feature is Enabled

### IsPaiEnabled
*Action* · `IsPaiEnabled`

### MarketingListMetadataUpdate
*Action* · `MarketingListMetadataUpdate`

### MarketingMetadataUpdate
*Action* · `MarketingMetadataUpdate`

### MarketingMetadataUpdatePostImport
*Action* · `MarketingMetadataUpdatePostImport`

### MoveRoutingRuleItemAt
*Action* · `MoveRoutingRuleItemAt`

### PostOperationRevokeUsrConsent
*Action* · `PostOperationRevokeUsrConsent`

### PostOrganizationProvisioningStatus
*Action* · `PostOrganizationProvisioningStatus`

### PostRetrieveRealTimeSuggestedActivities
*Action* · `PostRetrieveRealTimeSuggestedActivities`

### PowerAutomateProxy
*Action* · `PowerAutomateProxy`

### Provision SharePoint Document Libraries
*Action, real-time* · `ProvisionSharePointDocumentLibraries`
> Provision SharePoint Document Libraries

### Pva.GetFeatureControlSet
*Action* · `PvaGetFeatureControlSet`

### Pva.GetUserBots
*Action* · `PvaGetUserBots`

### QueryExchange
*Action* · `QueryExchange`

### RecognizeText
*Action* · `RecognizeText`

### RemoveMarketingListMembersByIds
*Action* · `RemoveMarketingListMembersByIds`

### ResourcesAddUpdateAction
*Action* · `ResourcesAddUpdateAction`

### ResourcesRemoveUpdateAction
*Action* · `ResourcesRemoveUpdateAction`

### Retrieve Appointments and ServiceAppointments by Resources
*Action* · `RetrieveActivitiesByResources`

### RetrieveActivities
*Action* · `RetrieveActivities`

### Routing Rule Set Validation
*Action* · `RoutingRuleSetValidation`

### Sales Insights CES API Handler
*Action* · `cesinvoke`

### Sales Insights create similar opportunitiy prediction model
*Action* · `CreateSimilarOpportunitiyPredictionModel`

### Sales Insights delete flow
*Action* · `DeleteFlow`

### Sales Insights execute SI request
*Action* · `ExecuteSIRequest`

### Sales Insights execute SI Sample Data request
*Action* · `ExecuteSISampleDataRequest`

### Sales Insights feedback
*Action* · `Feedback`

### Sales Insights get ACI mars connector status
*Action* · `GetACIMarsConnectorStatus`

### Sales Insights get Feature configuration
*Action* · `GetSIFeatureConfiguration`

### Sales Insights get legal acceptance status
*Action* · `GetLegalAcceptanceStatus`

### Sales Insights get NotesAnalysis
*Action* · `GetNotesAnalysis`

### Sales Insights get RI provisioning status
*Action* · `GetRIProvisioningStatus`

### Sales Insights get RI tenant endpoint
*Action* · `GetRITenantEndpoint`

### Sales Insights get service base URL
*Action* · `GetServiceBaseUrl`

### Sales Insights get SI license status
*Action* · `GetSILicenseStatus`

### Sales Insights get SI package status
*Action* · `GetSIPackageStatus`

### Sales Insights get TalkingPoints
*Action* · `GetTalkingPoints`

### Sales Insights Install SI Solution
*Action* · `InstallSalesInsightsSolution`

### Sales Insights perform NotesAnalysis action
*Action* · `PerformNotesAnalysisAction`

### Sales Insights retrieve KPI values from DCI
*Action* · `RetrieveKPIvaluesfromDCI`

### Sales Insights retrieve KPI values from RI
*Action* · `RetrieveKpiValuesFromRI`

### Sales Insights retrieve type values from DCI
*Action* · `RetrieveTypeValuesFromDCI`

### Sales Insights set feature status
*Action* · `SetFeatureStatus`

### Sales Insights set legal acceptance status
*Action* · `SetLegalAcceptanceStatus`

### Sales Insights set TalkingPoint linked status
*Action* · `SetTalkingPointLikedStatus`

### Sales Insights start ODOS provisioning
*Action* · `StartODOSProvisioning`

### Sales Insights start RI provisioning
*Action* · `StartRIProvisioning`

### Sales Insights update feature config
*Action* · `Updatefeatureconfig`

### Sales Insights update RI tenant info
*Action* · `UpdateRITenantInfo`

### SaveCalendar
*Action* · `SaveCalendar`

### SaveServiceTreeData
*Action* · `SaveServiceTreeData`

### Service Calendar Action
*Action* · `ServiceCalendarAction`

### Set SharePoint Document Status
*Action* · `SetSharePointDocumentStatus`
> Set SharePoint Document Status

### Set Teams Document Status
*Action* · `SetTeamsDocumentStatus`
> Set Teams Document Status

### Snooze EmailInfra based ActionCards
*Action* · `SnoozeEmailInfraActionCard`

### TrackExchangeActivity
*Action* · `TrackExchangeActivity`

### Update Auto Capture dialog settings
*Action — manual/on demand* · `UpdateAutoCaptureSettings`

### Update_Contact_User_Pass
*Action* · `Update_Contact_User_Pass`
- update **contact**: new_username, new_password

### UpdateUserConsentBasedonSecurityRoles
*Action* · `UpdateUserConsentBasedonSecurityRoles`

### UpgradeTelemetry
*Action* · `UpgradeTelemetry`

### ValidateAIConfiguration
*Action* · `ValidateAIConfiguration`

### Validates whether SharePoint is enabled or not
*Action, real-time* · `IsSharePointEnabled`
> Validates whether SharePoint is enabled or not

### Verify if Data Validation is enabled
*Action* · `IsLinkedInDataValidationEnabled`

## opportunity (83)

### Change owner of opportunity when not created from crm
*Workflow, real-time — on create*
- assign **opportunity** to someone

### Create Task When Opportunity Created
*Workflow — on create*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)  (×2)

### Create_Opportunity_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_opportunityref, new_name)

### Delete_Opportunity_To_Syncer
*Workflow, real-time — on delete*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Fill EVB Date Fill
*Workflow, real-time — on create; on change of new_evb*
- update **opportunity**: new_evb_fill_date

### Fill Potential Customer By Contact
*Workflow, real-time — on create; on change of parentaccountid*
- update **opportunity**: customerid

### Manage Color Code for Opp
*Workflow — on change of new_energy_code*
- run «Manage Color Code for Opp Neue Energie»
- if: کد رنگ های مشکی
- update **opportunity**: new_energy_color  (×5)
- if: 9700 مشکی
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)  (×2)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, new_subjectoption, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)  (×6)

### Manage Color Code for Opp Neue Energie
*Workflow — called by other processes*
- update **opportunity**: new_energy_color  (×4)
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)  (×6)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو

### Opportunity-Angebot-Set-FinishDate-TwoWeeks-After-Today
*Workflow, real-time — on create*
- update **opportunity**: new_dateend

### Opportunity-Set Not Send Email Prize
*Workflow — manual/on demand*
- update **opportunity**: new_not_send_email_prize

### Save Old Owner
*Workflow — on create*
- update **opportunity**: new_old_owner

### Set_Bonus_Deduction
*Workflow, real-time — manual/on demand*
- update **opportunity**: new_bonus_deduction

### Status Tarif Check Controll
*Workflow, real-time — on change of new_status_tarif_check*
- update **opportunity**: new_bezahlt
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- set status of **opportunity** → به دلیل لغو

### Update_Opportunity_To_Syncer
*Workflow — on change of new_employment_status,new_marital_status,new_insurance_type,new_category,new_activity_type,new_job_type,new_animal_type,new_mah,new_accommodation_type,new_lease_type,new_available_connection_type,new_race,new_namedastghah,new_monthly_income,new_operation_property,new_amount_money_advance,new_rech_personal_legal_matters,new_masraf,new_moshakhasat,new_rech_tenant,new_step,new_modat,new_house_size,new_mablaq,new_home_heating,new_bisiness_postalcode,new_code,new_energy_code,new_monthly_installment,new_rech_divorce_marriage,new_mobilenew,new_kontor,new_rech_job,new_netz,new_age,new_animal_age,new_rech_driving_policy,new_phone_type,new_simcard_type,new_javan,new_num_extracted_teeth,new_family_count,new_datelaqve,new_datefrosh,new_startdate,new_buy_date,new_modemdate,new_accommodation_expire_date,new_dateend,new_contract_company,new_pelak,new_yearend,new_not_send_email_prize,new_created_from,new_tavizdate,new_new_phone_price,new_rech_rent_own_house,new_have_credit_open,new_hot_water,new_vvl,new_shomareh,new_versicherungnummer,new_tv,new_tsn,name,new_strassecontact,new_street,statecode,new_stadtcontant,new_city,new_sf_klasse,new_sabetnumber,new_refrenznummer,customerid,new_plzcontact,new_pelaknumber,ownerid,new_lte,new_numbercustomer,new_kabel,new_hsn_tsn,new_codeposti,new_flagchange,new_evb_fill_date,new_evb,new_dsl,new_driteanbieter,new_datedritean,new_driteantowoption,new_countrycontact,new_country,new_request_number,new_anschluss,parentaccountid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_opportunityref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Case
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_opportunityref, new_name)

### ارسال ایمیل Antrag
*Workflow — called by other processes*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessageTakeArray
- create **email** (to, subject, new_style, description, regardingobjectid, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, new_secondbody, ownerid, prioritycode, scheduledend, scheduledstart)
- run «Send Email To Site»

### ارسال ایمیل نامه لغو در صورت فراخوانی
*Workflow — manual/on demand; called by other processes*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessageTakeArray
- create **email** (to, subject, new_style, description, new_secondbody, new_send_method, regardingobjectid, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, ownerid, prioritycode, scheduledend, scheduledstart)
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- run «Send Email To Site»
- update **opportunity**: new_kundigung_vertrag_report_noteid, new_date_send_email_cancel

### ایجاد فعالیت مشاوره مجدد یک ماه قبل از اتمام قرارداد
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)

### ایجاد فول نامه لغو بر روی فرصت در قالب نوت
*Workflow — on change of new_letter_from_letters,new_letter_from_opp*
- custom code TB_Report: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- update **opportunity**: new_letter_from_opp
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterFullAsPdf
- custom code TB_Report: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- update **opportunity**: new_letter_from_letters

### بررسی این که مشتری ویژه هست یا نه
*Workflow — on create*
- custom code Tarefe: Tarefe.Opportunity.Opportunity_Check_User_Is_Vip

### بعد از 2 ماه اگر همچنان این انگبوت هیچ تغییر وضعیتی نداده بود به صورت خودکار تغییر وضعیت به لاست
*Workflow — called by other processes*
- set status of **opportunity** → به دلیل اتمام و بررسی نشدن آن

### بعد از یک ماه از تاریخ شروع قرارداد اگر پورتال قرارداد ماکسپول بود تسک ایجاد بشه
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- update **opportunity**: new_date_create_task_maxpool

### پاک کردن فیلد فرصت هنگامی که حذف مشود یا غیرفعال میشود در رکورد متناظر امتیاز آن
*Workflow — on change of statecode; on delete*
- custom code Tarefe: Tarefe.Opportunity.ResetPointWhenOppLost
- update **new_points**: new_introducer_opportunity, new_review_date
- set status of **new_points** → منتظر ثبت فرصت

### پر کردن تاریخ پس دادن مودم
*Workflow — on create*
- update **opportunity**: new_modemdate

### پر کردن فیلد DriteAn
*Workflow, real-time — on create*
- update **opportunity**: new_datedritean

### پر کردن فیلد های تاریخ اتمام و لغو با توجه به تاریخ شروع-اکتول تی
*Workflow, real-time — on create; on change of new_category,new_step,new_modat,new_yearend*
- if: در دل کاستوم بررسی میشود که نوع قرارداد از موارد زیر نباشد : ADAC,CreditKart,Credit,GKV,PKV,سایر
- custom code Tarefe: Tarefe.Opportunity.Opportunity_FillDates

### تطبیق آدرس شرکت درون فرصت
*Workflow, real-time — on create; on change of parentaccountid*
- update **opportunity**: new_country, new_city, new_street, new_pelaknumber, new_codeposti

### تطبیق آدرس کانتکت درون فرصت
*Workflow, real-time — on create; on change of new_step,new_modat,new_startdate,parentcontactid*
- update **opportunity**: new_plzcontact, new_countrycontact, new_stadtcontant, new_hunsummercontact, new_strassecontact

### تغییر مالک فرصت هایی که از آپ ایجاد میشوند و ایجاد تسک برای فرصت های اکتول
*Workflow — on create*
- assign **opportunity** to someone
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)

### تولید و ذخیره نامه لغو در نوت فرصت فروش
*Workflow — manual/on demand*
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- update **opportunity**: new_kundigung_vertrag_report_noteid

### حذف فرصت
*Workflow, real-time — manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.Delete

### فرصت - بررسی داشتن شرایط ایجاد تسک دادن کد هدیه معرفی یک شخص
*Workflow — on create*
- update **contact**: new_date_task_gift
- custom code Tarefe: Tarefe.Contact.Contact_GetByIdentificationCode
- create **task** (subject, description, regardingobjectid, ownerid, prioritycode, scheduledend, scheduledstart)

### فرصت - بررسی داشتن قرارداد دندان هنگام ایجاد
*Workflow — on create; on change of new_category*
- run «مشتری - بررسی داشتن قرارداد دندان»

### فرصت - بررسی داشتن قرارداد دندان هنگام ایجاد هنگام حذف
*Workflow, real-time — on delete*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Has_Dentis_Contract
- update **contact**: new_has_dentis_contract

### فرصت - بررسی داشتن قرارداد گاز/برق هنگام حذف
*Workflow, real-time — on delete*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Has_Gas_Strom_Contract
- update **contact**: new_has_gas_strom_contract

### فرصت - بررسی داشتن گاز/برق هنگام ایجاد
*Workflow — on create; on change of new_category*
- run «مشتری - بررسی داشتن قراداد گاز/برق»

### فرصت- ثبت اکتول تی ارسال ایمیل راهنمایی
*Workflow — on create; on change of new_step; manual/on demand*
- if: اگر مساوی اکتول تی نبود ادامه نده
- if: AUTOVERSICHERUNG
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- custom code Tarefe: Tarefe.Note.Note_Copy
- custom code action: new_Action_Send_Email_ActuelT_Help_Opportunity
- calls: https://cdn.tarefe.de/emailTemplate/5e214674-f399-4e6c-a9ff-f6cf0051dfe4.pdf, https://cdn.tarefe.de/emailTemplate/cb0ed841-e595-45ea-bb2c-afa179592071.pdf, https://cdn.tarefe.de/emailTemplate/5e508866-f3cf-442f-b42f-98e4fda2115c.pdf, https://cdn.tarefe.de/emailTemplate/46a5c731-4965-41bb-a9bd-484f7417349b.pdf, https://cdn.tarefe.de/emailTemplate/9837d47f-4aab-4ea0-b0db-71fe767f041d.pdf, https://cdn.tarefe.de/emailTemplate/1c365b11-0357-4c87-b986-99d87ec059a7.pdf, https://cdn.tarefe.de/emailTemplate/8f282a20-6f7c-48c9-8990-a84d3a199488.pdf, https://cdn.tarefe.de/emailTemplate/9f3e6e33-a1b0-47fe-bd69-b896443a559d.pdf, https://cdn.tarefe.de/emailTemplate/9fd05cbe-285a-44dc-8c5d-e843ad714685.pdf, https://cdn.tarefe.de/emailTemplate/5b258e9e-2945-4e95-a81f-06776dca64ee.pdf

### فرصت-آیای قرارداد تمدید شد؟
*Workflow, real-time — on change of new_parent_opportunity*
- if: ایجاد تسک به درخواست خانم بچاوی حذف شد چون 2 تا می ساخت
- create **new_points** (new_type, new_customer, new_opportunity, new_point, new_point_by_level, new_settled, new_send_to_site, statecode)

### فرصت-ارسال ایمیل هنگام ثبت از طریق سایت
*Workflow — on create*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **email** (to, subject, new_style, new_secondbody, new_send_method, regardingobjectid, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, ownerid, prioritycode, scheduledend, scheduledstart)
- run «Send Email To Site»

### فرصت-ارسال پیام به تیکت مشتری بعد از تیک زدن اتوماتیک ارسال شود
*Workflow — on create; on change of new_automatic_send_message_to_ticket_date*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- custom code action: new_Action_Send_Message_To_Note

### فرصت-اکتول-اتمام لغو-ساخت تسک و نامه لغو
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- run «فرصت-ایجاد نامه لغو و افزودن به فرصت»

### فرصت-اکتول-پر کردن تاریخ لغو 2 ماه قبل از تاریخ اتمام
*Workflow — on create; on change of new_step,new_dateend*
- update **opportunity**: new_datelaqve

### فرصت-انگبوتی که از سمت سایت می آید برایش سرنخ ایجاد شود
*Workflow — on create*
- create **lead** (subject, new_status, new_type, customerid, qualifyingopportunityid, leadsourcecode, mobilephone, telephone1, emailaddress1, new_motherllanguage, transactioncurrencyid, donotsendmm, preferredcontactmethodcode, donotemail, followemail, donotbulkemail, donotphone, donotpostalmail, ownerid, statuscode, address1_addresstypecode, address1_shippingmethodcode, address2_addresstypecode, address2_shippingmethodcode, confirminterest, decisionmaker, donotfax, evaluatefit, firstname, lastname, leadqualitycode, prioritycode, salesstagecode, statecode)

### فرصت-ایجاد اکتول تی ثبت پورسانت
*Workflow — on create; on change of new_step,new_contract_company*
- update **opportunity**: new_commision_amount  (×3)

### فرصت-ایجاد تیکت هنگام ایجاد فرصت
*Workflow — on create; manual/on demand; called by other processes*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **incident** (title, customerid, new_opportunity, new_status, statuscode, new_category, description, isescalated, firstresponsesent, blockedprofile, activitiescomplete, checkemail, decremententitlementterm, firstresponseslastatus, followuptaskcreated, incidentstagecode, isdecrementing, ownerid, prioritycode, resolvebyslastatus, routecase, severitycode, statecode, transactioncurrencyid)
- update **opportunity**: new_case
- set status of **incident** → بسته شده

### فرصت-ایجاد رکورد امتیاز در صورت ایجاد فرصت از نوع AktuellT
*Workflow — on create; on change of new_step; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.SiteSetting.GetLastSiteSettingRecord
- create **new_points** (new_type, new_customer, new_opportunity, new_point, new_settled, new_point_by_level, new_send_to_site, statecode)

### فرصت-ایجاد نامه لغو و افزودن به فرصت
*Workflow — manual/on demand; called by other processes*
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File

### فرصت-ایجاد یا حذف رکورد امتیاز با توجه به وضعیت فرصت
*Workflow — on change of statecode*
- custom code Tarefe: Tarefe.Opportunity.Opportunity_CloseAsLost_RemovePoint
- run «Recalculate_Contact_Rollup»
- run «فرصت-ایجاد رکورد امتیاز در صورت ایجاد فرصت از نوع AktuellT»
- run «Recalculate_Contact_Rollup»

### فرصت-بررسی این که تاریخ اولین فعالیت برای مشتری ثبت شده یا نه
*Workflow — on create*
- update **contact**: new_first_opp_start

### فرصت-بررسی تکمیل شدن به قرارداد انرژی-ارتباطات-بیمه
*Workflow — on create; on change of new_step*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.UserHas_En_In_Te
- update **contact**: new_en_tel_ensurance

### فرصت-پر کردن تاریخ شروع فرصت های انگبوت در صورتی که خالی باشد
*Workflow — on create*
- update **opportunity**: new_modat, new_startdate

### فرصت-پرکردن فیلد تاریخ تیکت بصورت اتوماتیک ایجاد شود
*Workflow — on create; on change of new_automatic_send_message_to_ticket*
- update **opportunity**: new_automatic_send_message_to_ticket_date

### فرصت-تغییر وضعیت بررسی داشتن تیکت
*Workflow — on change of statecode; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Case.FindLastCaseForOpportunity
- update **opportunity**: new_case
- run «فرصت-ایجاد تیکت هنگام ایجاد فرصت»

### فرصت-جلوگیری از برنده شدن فرصت های اکتول کمتر از سه ماه از تاریخ ایجاد/شروع
*Workflow, real-time — on change of statecode*
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.PreventWonOppLessThanXMonth

### فرصت-حذف رکورد امتیاز قبل از حذف فرصت
*Workflow, real-time — on delete*
- custom code Tarefe: Tarefe.Opportunity.Opportunity_Delete_RemovePoint

### فرصت-در صورتی که لاست یا ون شود بله کردن فیلد ایمیل شرکت در قرعه کشی ارسال نشود
*Workflow — on change of statecode*
- update **opportunity**: new_not_send_email_prize

### فرصت-ذخیره تاریخ لغو قرارداد
*Workflow — on change of statecode*
- update **opportunity**: new_cancellation_date, new_has_been_cancelled

### فرصت-محاسبه امتیاز فرصت برای اپراتورها
*Workflow — on create; on change of new_category,new_mah,new_step,new_mablaq; manual/on demand*
- if: 0.004*1.19
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.EvalOperatorPoint
- update **opportunity**: new_opp_point
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.EvalOperatorPoint
- update **opportunity**: new_opp_point
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.EvalOperatorPoint
- update **opportunity**: new_opp_point
- custom code TarefeBusiness2: TarefeBusiness2.Opportunity.EvalOperatorPoint
- update **opportunity**: new_opp_point  (×4)

### فرصت-محاسبه تعداد فرصت های فعال اکتول تی یک مشتری
*Workflow — on create; on change of new_step,statecode*
- run «مشتری-محاسبه تعداد قرارداد فعال اکتول تی»

### فرصت-محاسبه تعداد فرصت های فعال اکتول تی یک مشتری_حذف
*Workflow, real-time — on delete*
- run «مشتری-محاسبه تعداد قرارداد فعال اکتول تی»

### فرصت-محاسبه گیمیفیکیشن
*Workflow, real-time — on delete*
- run «مشتری-محاسبه گیمیفیکیشن»

### فرصت-محاسبه گیمیفیکیشن
*Workflow — on create; on change of new_category,new_step,customerid,statecode*
- run «مشتری-محاسبه گیمیفیکیشن»

### موعد فرا رسیدن تاریخ لغو نسخه جدید1403-03-15
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_customer, new_task_type, ownerid, prioritycode, scheduledend, scheduledstart)
- run «فرصت-ایجاد نامه لغو و افزودن به فرصت»

### موعد فرارسیدن تاریخ پس دادم مودم-جدید
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart)
- update **opportunity**: new_date_create_task_returnmodem

### موعد فرارسیدن تاریخ تمام-فقط تسک
*Workflow — called by other processes*
- set status of **opportunity** → Won  (×2)
- create **task** (subject, description, regardingobjectid, ownerid, prioritycode, scheduledend, scheduledstart)

### نگهداری مرحله قبلی در هنگام تغییر مرحله در فرصت
*Workflow, real-time — on change of new_step*
- update **opportunity**: new_old_step  (×4)

### هفده ماه قبل از تاریخ اتمام تنظیم شود VVL
*Workflow, real-time — on create; on change of new_category,new_step*
- update **opportunity**: new_vvl

### هنگام ایجاد فرصت برای مشتری اگر از جنس اکتول تی بود و اگر امتیازی غیر فعال داشت مقدار میگیرد
*Workflow — on create; on change of new_step,statecode*
- custom code Tarefe: Tarefe.Opportunity.CheckSomeoneIntroduceOppCustomer
- update **new_points**: new_introducer_opportunity, new_review_date
- set status of **new_points** → منتظر تاریخ بررسی

### AktuellT=Yes اکانت و نوع پرداخت و مبلغ
*Business rule, real-time*
> AktuellT=Yes اکانت و نوع پرداخت و مبلغ

### Opportunity Revenue Rule
*Business rule — on create*

### آیا این قرارداد در هیج حالتی پورسانت داده نشود؟
*Business rule, real-time*
> آیا این قرارداد در هیج حالتی پورسانت داده نشود؟

### اجباری بودن تاریخ اتمام بر اساس
*Business rule, real-time*
> در حالت اکتول تی فقط وقتی کارت اعتباری یا حساب بانکی باشه تاریخ اتمام نباید اجباری باشه در مابقی حالات باید اجباری باشد.

### اجباری-غیراجباری بودن پورتال ها
*Business rule, real-time*
> Click to add description

### اگر اکتول تی بود مشتری اصلی اجباری شود
*Business rule, real-time*
> اگر اکتول تی بود مشتری اصلی اجباری شود

### اگر مرحله انگبوت بود فیلد تاریخ لغو مخفی شود
*Business rule, real-time*
> اگر مرحله انگبوت بود فیلد تاریخ لغو مخفی شود

### فیلد استتوس تعریف چک نمایش یا عدم نمایش
*Business rule, real-time*
> Click to add description

### مدیریت فیلد دلیل اتمام
*Business rule, real-time*
> Click to add description

### نامه از طریق فرصت باشد
*Business rule, real-time*
> نامه از طریق فرصت باشد

### نامه از طریق نامه ها باشد
*Business rule, real-time*
> نامه از طریق نامه ها باشد

### نمایش یا عدم نمایش فیلد رفرنس نوما
*Business rule, real-time*
> Click to add description

### Action_Call_Create_Letter_Action
*Action* · `Action_Call_Create_Letter_Action`
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendNoteFileAndTakeFileUrl
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **email** (new_emailaddress, to, subject, new_style, description, new_secondbody, new_send_method, regardingobjectid, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, prioritycode, scheduledend, scheduledstart)
- custom code Tarefe: Tarefe.Note.Note_Copy
- run «Send Email To Site»

### Clone_Opportunity
*Action* · `Clone_Opportunity`
- custom code BayatSoft.MSCRM: BayatSoft.MSCRM.Utility.CloneRecord

### Follow up with Opportunity
*Business process flow* · `make_contact_on_opportunity`
> Use this task flow for quick communication with your customer. Access key information about your opportunity, along with information from the related contact and account.

### Opportunity Sales Process
*Business process flow* · `opportunitysalesprocess`
> This is the default process flow for working on an opportunity.

## contact (35)

### Create Business When Lead Qualified
*Workflow — on create*
- create **new_customer_business** (new_customer, new_pelak, new_street, new_city, new_postalcode)

### Create task for owner of  contact for say congratulation after 5 days
*Workflow — called by other processes*
- create **task** (subject, description, regardingobjectid, new_task_type, ownerid, prioritycode, scheduledend, scheduledstart)

### Create_Contact_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_customerref, new_name)

### Delete_Contact_To_Syncer
*Workflow, real-time — on delete*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### if Create <a staff email>
*Workflow — on create; on change of emailaddress1*
- create **bsnotif_notification** (bsnotif_name, bsnotif_type, bsnotif_for_all_user, bsnotif_user, bsnotif_message, bsnotif_customer)

### Prevent Duplicate Email In Contact
*Workflow, real-time — on create; on change of emailaddress1*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.PreventInsertDuplicateContactByEmail

### Recalculate_Contact_Rollup
*Workflow — manual/on demand; called by other processes*
- custom code BayatSoft.MSCRM: BayatSoft.MSCRM.ReCalculateRollup

### Save Old Owner
*Workflow — on create*
- update **contact**: new_old_owner

### Update_Contact_To_Syncer
*Workflow — on change of new_employment_status,new_maritalstatus,new_activity_type,new_job_type,new_accommodation_type,new_nahvehashnaee,spousesname,new_username,new_monthly_income,new_operation_property,new_nationality,new_house_size,new_password,new_country,new_id,new_representator,new_monthly_installment,new_fax,new_customernumber,new_age,new_motherllanguage,new_street,gendercode,new_spouse_phone,new_family_count,new_partner_birthdate,new_tavalod,new_marride,new_accommodation_expire_date,new_pelak,new_has_insurance,new_spouse_email,new_has_energy,new_has_telecom,new_vip,new_have_credit_open,new_strasse,statecode,new_stadt,new_staatsangehrigkeit,new_has_rechtsschutz,new_plz,ownerid,mobilephone,familystatuscode,lastname,new_introductiontothecompany,new_iban,new_has_hausrat,new_hausnummer,new_has_haftpflicht,firstname,emailaddress1,new_countrye,business2,telephone1,birthdate,new_bic,new_accounttype; manual/on demand; called by other processes*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_customerref, new_name)  (×2)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Opportunity
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Case
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Children
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Business
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Point

### شخص - حذف شخص
*Workflow, real-time — manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.ContactDelete

### شخص - معرفی آپ بله شد
*Workflow — on change of new_introduce_app_to_customer*
- update **contact**: new_introduce_app_to_customer_date, new_introduce_app_to_customer_date2

### شخص - مقدار گرفتن فیلد تاریخ 12 روز بعد از آپ را معرفی کردم
*Workflow — on change of new_introduce_app_to_customer_date2*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart, sortdate)

### شخص - مقدار گرفتن فیلد تاریخ 5 روز بعد از آپ را معرفی کردم
*Workflow — on change of new_introduce_app_to_customer_date*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart, sortdate)

### فعال غیر فعال کردن مشتری براساس داشتن فرصت های Actuell , Actuell T
*Workflow — manual/on demand*
- custom code Tarefe: Tarefe.Contact.Contact_IsActive

### مشتری - بررسی داشتن قراداد گاز/برق
*Workflow — on create; manual/on demand; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Has_Gas_Strom_Contract
- update **contact**: new_has_gas_strom_contract

### مشتری - بررسی داشتن قرارداد دندان
*Workflow — on create; manual/on demand; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Has_Dentis_Contract
- update **contact**: new_has_dentis_contract

### مشتری- بررسی این که مشتری الان فرصت اکتول تی فعال دارد یا خیر اگر داشت رکورد امتیاز وفاداری ایجاد می
*Workflow — called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.IsUserActive_HasAktuellT
- custom code TarefeBusiness2: TarefeBusiness2.SiteSetting.GetLastSiteSettingRecord
- create **new_points** (new_type, new_customer, new_point, new_settled, new_send_to_site, statecode)
- update **contact**: new_first_opp_start  (×2)

### مشتری-ایجاد تیکت خوش آمد گویی برای مشتریان که تیکت ندارند
*Workflow — manual/on demand*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **incident** (title, customerid, statuscode, description, isescalated, firstresponsesent, blockedprofile, activitiescomplete, checkemail, decremententitlementterm, firstresponseslastatus, followuptaskcreated, incidentstagecode, isdecrementing, prioritycode, resolvebyslastatus, routecase, severitycode, statecode, transactioncurrencyid)

### مشتری-ایجاد رکورد امتیاز برای ریجستر شدن
*Workflow — on create; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.SiteSetting.GetLastSiteSettingRecord
- create **new_points** (new_type, new_customer, new_point, new_point_by_level, new_settled, new_send_to_site, statecode)

### مشتری-ایجاد رکورد امتیاز برای مشتری که یک شخص دیگه را معرفی کرده
*Workflow — on create; on change of new_representator; called by other processes*
- custom code Tarefe: Tarefe.Contact.Contact_GetByIdentificationCode
- custom code TarefeBusiness2: TarefeBusiness2.SiteSetting.GetLastSiteSettingRecord
- create **new_points** (new_type, new_customer, new_point, new_customer_introduced, new_settled, new_send_to_site, statecode)
- set status of **new_points** → منتظر ثبت فرصت

### مشتری-ایجاد رکورد امتیاز معرفی شده
*Workflow — on create; on change of new_representator*
- custom code TarefeBusiness2: TarefeBusiness2.SiteSetting.GetLastSiteSettingRecord
- custom code Tarefe: Tarefe.Contact.Contact_GetByIdentificationCode
- create **new_points** (new_type, new_customer, new_point, new_settled, new_owner_code, new_send_to_site, statecode)

### مشتری-برور رسانی تاریخ های فعال/غیرفعال
*Workflow — on change of new_has_aktuellt*
- update **contact**: new_date_active, new_date_deactive  (×2)

### مشتری-پر کردن نام کاربری و کلمه عبور
*Workflow, real-time — on create; on change of mobilephone,emailaddress1,telephone1; manual/on demand*
- custom code BayatSoft.MSCRM: BayatSoft.MSCRM.GenerageRandomNumberAsText
- update **contact**: new_username, new_password  (×3)

### مشتری-تبدیل ایمیل به حروف کوچک
*Workflow — on create; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Utility.ToLower
- update **contact**: emailaddress1

### مشتری-درخواست حذف اکانت
*Workflow — on change of new_customer_delete_contact*
- create **task** (subject, description, regardingobjectid, ownerid, prioritycode, scheduledend, scheduledstart)

### مشتری-ذخیره تکس تاریخ تولد
*Workflow — on create; on change of birthdate; called by other processes*
- custom code Tarefe: Tarefe.Contact.Contact_Update_BirthdateText

### مشتری-ساخت لینک معرف
*Workflow — on create; on change of new_id; manual/on demand*
- update **contact**: new_link_referer
- calls: https://tarefe.de/referral/

### مشتری-محاسبه امتیاز مشتری و ارسال به سایت
*Workflow — manual/on demand; called by other processes*
- run «Recalculate_Contact_Rollup»
- run «Update_Contact_To_Syncer»

### مشتری-محاسبه تعداد قرارداد فعال اکتول تی
*Workflow — manual/on demand; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Opportunity_AktuellT_Active_Count
- update **contact**: new_active_opportunity_count

### مشتری-محاسبه گیمیفیکیشن
*Workflow — manual/on demand; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.Contact_Gamefication

### مشتری-محاسبه نقره ای-برنزی-طلایی بودن مشتری
*Workflow — manual/on demand; called by other processes*
- custom code TarefeBusiness2: TarefeBusiness2.Contact.EvalCustomerType_NewVersion
- update **contact**: new_customer_type  (×4)

### تاریخ اولین ورود به سایت
*Business rule, real-time*
> Click to add description

### مشتری‌های نقره‌ای و طلایی
*Business rule, real-time*
> Click to add description

### Sales Insights GDPR optout contact
*Action* · `GDPROptoutContact`
- update **contact**: msdyn_gdproptout  (×2)

### Update Contact
*Business process flow* · `update_contact`
> Use this task flow to quickly update contact information, including business and personal information. This flow includes information from the related account.

## incident (15)

### After two month change status from close to problem resolved
*Workflow — on change of statecode*
> جدید: وقتی بدون زمینه قبلی کاربر یک تیکت ثبت میکند پاسخ کاربر: وقتی کاربر در جواب ما باز مدرک یا جوابی فرستاده منتظر پاسخ کاربر: وقتی ما به کاربر پیغام میدیم و ازش انتظار داریم به ما جواب بده و یا مدرکی را بفرسته بایگانی: وقتی یک تیکت کارش تمام میشه و قرار نیست ادامه پیدا کند اتمام: هر تیکت در بایگانی بعد از گذشت دو ماه به صورت اتومات به این بخش انتقال داده میشه
- set status of **incident** → اتمام

### Create_Case_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.Create_SiteSyncer_All_Case_Answer

### Delete_Case_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Ticket Change Status When Status Field on the form Changed
*Workflow, real-time — on change of new_status*
- set status of **incident** → بسته شده
- set status of **incident** → پاسخ داده شده
- set status of **incident** → در انتظار پاسخ

### Ticket Create From Site Change Owner to Contact Owner
*Workflow — on create*
- assign **incident** to someone

### Update_Case_To_Syncer
*Workflow — on change of new_status,new_category,new_opportunity,subjectid,ownerid,caseorigincode,emailaddress,description,customerid,title,ticketnumber; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)  (×2)

### تیکت-ایجاد ایمیل خوش آمد گویی برای تیکت هایی که ایمیل ارسال نشده بود
*Workflow — manual/on demand*
- run «304fdd81-3f76-478b-a429-5529e8b6153f»

### تیکت-باز کردن تیکت هنگام ررسید تاریخ بررسی و نمایش پیغام بررسی
*Workflow — called by other processes*
- set status of **incident** → در انتظار پاسخ
- update **incident**: new_show_follow_up_again

### تیکت-خالی کردن نمایش پیغام بررسی با بستن تیکت
*Workflow, real-time — on change of statecode*
- update **incident**: new_show_follow_up_again

### Action_Create_Note_Case
*Action* · `Action_Create_Note_Case`
- custom code Tarefe: Tarefe.Note.Note_Copy

### Action_Get_3_Answer_Case
*Action* · `Action_Get_3_Answer_Case`
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.AI.SuggetAnswer

### Action_Send_Message_To_Note
*Action* · `Action_Send_Message_To_Note`
- custom code Tarefe: Tarefe.Note.Note_Copy

### Action_Translate_Case_Response
*Action* · `Action_Translate_Case_Response`
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.AI.TranslateAnswer

### Action_Translate_Case_To_User_Language
*Action* · `Action_Translate_Case_To_User_Language`
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.AI.TranslateHistory

### Phone to Case Process
*Business process flow* · `phonetocaseprocess`
> This is the default process flow for working on a case.

## lead (13)

### Change Lead Status Field
*Workflow — on change of statecode*
- update **lead**: new_status  (×3)

### Create_Lead_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_leadref, new_name)

### Delete_Lead_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_Lead_To_Syncer
*Workflow — on change of new_status,new_insurance_type,new_type,new_activity_type,new_job_type,new_animal_type,new_accommodation_type,new_lease_type,new_available_connection_type,new_race,new_annual_consumption,new_monthly_income,new_operation_property,new_amount_money_advance,new_rech_personal_legal_matters,new_nationality,new_rech_tenant,new_house_size,new_home_heating,new_cuntry,new_bisiness_postalcode,new_leadcode,new_monthly_installment,new_rech_divorce_marriage,new_rech_job,new_age,new_animal_age,new_motherllanguage,new_rech_driving_policy,new_phone_type,new_simcard_type,new_gender,new_num_extracted_teeth,new_family_count,new_dateofconsultation,new_buy_date,new_birthday,new_accommodation_expire_date,new_new_phone_price_base,new_new_phone_price,new_rech_rent_own_house,new_have_credit_open,new_hot_water,new_tsn,subject,new_street,statecode,new_city,new_staatsangehrigkeit,new_sfklasse,new_rank,new_codeposti,ownerid,fullname,mobilephone,leadsourcecode,lastname,new_kable,new_hst,new_pelak,firstname,new_dsl,new_countrye,telephone1; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_leadref, new_name)

### When Lead was Disqualifed User Have to Fill Desc
*Workflow, real-time — on change of statecode*

### سرنخ-تبدیل ایمیل به حروف کوچک
*Workflow — on create; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Utility.ToLower
- update **lead**: emailaddress1

### لید-ارسال ایمیل هنگام ثبت از طریق سایت
*Workflow — on create*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- create **email** (to, subject, new_style, description, new_secondbody, new_send_method, regardingobjectid, deliveryprioritycode, directioncode, followemailuserpreference, new_iscustome, notifications, ownerid, prioritycode, scheduledend, sortdate)
- run «Send Email To Site»

### لید-ایجاد نوتیفیکیشن برای مالک جاری
*Workflow, real-time — manual/on demand*
- create **bsnotif_notification** (bsnotif_name, bsnotif_type, bsnotif_for_all_user, bsnotif_user, bsnotif_message, bsnotif_lead)

### لید-بررسی لید ثبت شده از طریق سایت
*Workflow — on create*
- if: اگر لید توسط سایت ایجاد شده بود
- create **bsnotif_notification** (bsnotif_name, bsnotif_type, bsnotif_for_all_user, bsnotif_user, bsnotif_message, bsnotif_lead)
- custom code action: new_User_Check_User_Or_Replace
- update **bsnotif_notification**: bsnotif_user
- custom code action: new_User_Check_User_Or_Replace
- update **bsnotif_notification**: bsnotif_user

### لید-پرکردن مشتری مرتبط در صورت یافتن
*Workflow — on create; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Lead.FindAndFillContactInLead
- update **lead**: customerid, new_convert_to_opportunity
- assign **lead** to someone

### پر بودن فیلد فرصت
*Business rule, real-time*
> Click to add description

### Sales Insights GDPR optout lead
*Action* · `GDPROptoutLead`
- update **lead**: msdyn_gdproptout  (×2)

### Lead to Opportunity Sales Process
*Business process flow* · `leadtoopportunitysalesprocess`
> This is the default process flow to work on a lead and convert it to an opportunity.

## bsnotif_notification (11)

### Notif_ChangeOwner_To_User
*Workflow, real-time — on create; on change of bsnotif_user*
- assign **bsnotif_notification** to someone

### Check For All User
*Business rule, real-time*
> Check For All User

### New business rule
*Business rule, real-time*
> Click to add description

### Notif is Case
*Business rule, real-time*
> Notif is Case

### Notif is Customer
*Business rule, real-time*
> Notif is Customer

### Notif is Invoice
*Business rule, real-time*
> Notif is Invoice

### Notif is Lead
*Business rule, real-time*
> Notif is Lead

### Notif is Opportunity
*Business rule, real-time*
> Notif is Opportunity

### Notif is Order
*Business rule, real-time*
> Notif is Order

### Notif is Quote
*Business rule, real-time*
> Notif is Quote

### Notif is Task
*Business rule, real-time*
> Notif is Task

## new_points (11)

### Create_Point_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_pointref, new_name)

### Delete_Point_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)
- run «مشتری-محاسبه امتیاز مشتری و ارسال به سایت»

### Fill Name Of Points Entity When Create
*Workflow — on create; on change of new_customer_introduced,new_customer,new_opportunity*
- update **new_points**: new_name  (×3)

### ReCalculate_Points_For_Customer_and_Eval_Type
*Workflow — on create; on change of statecode; on delete*
- run «Recalculate_Contact_Rollup»
- run «مشتری-محاسبه نقره ای-برنزی-طلایی بودن مشتری»

### Update_Point_To_Syncer
*Workflow — on change of new_type,new_customer_introduced,new_customer,new_gift_code,new_introducer_opportunity,new_opportunity,new_description,new_review_date,new_point,new_level,new_point_by_level,new_settled,new_topic,statecode,ownerid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_pointref, new_name)  (×2)

### امتیاز-محاسبه مجدد امتیاز مشتری با ایجاد یا تغییر رکورد امتیاز و ارسال به سایت
*Workflow — on create; on change of new_point,new_point_by_level*
- run «مشتری-محاسبه امتیاز مشتری و ارسال به سایت»

### امتیازات-آیا تسویه شد؟ برابر با بله
*Workflow, real-time — on change of new_settled*
- set status of **new_points** → کد هدیه اختصاص داده شد

### امتیازات-ایجاد تسک برای  خانم بچاوی در صورت ساخت رکورد کد هدیه
*Workflow — on create*
- create **task** (subject, description, regardingobjectid, new_customer, ownerid, prioritycode, scheduledend, scheduledstart, transactioncurrencyid)  (×3)

### امتیازات-بررسی کننده درج تکراری
*Workflow, real-time — on create*
- custom code Tarefe: Tarefe.Point.ControlDuplicate

### امتیازات-پرکردن تاپیک
*Workflow — on create; on change of new_type,new_customer_introduced,new_customer,new_introducer_opportunity,new_opportunity; manual/on demand*
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic
- custom code Tarefe: Tarefe.MessageTemplate.GetTemplateMessage
- update **new_points**: new_topic  (×2)

### فعال کردن امتیاز داده شده به مشتری در صورت داشتن شرایط
*Workflow, real-time — manual/on demand*
- custom code Tarefe: Tarefe.Point.CheckContactCanIntruduceSomeone2
- set status of **new_points** → Active
- run «f3066c2b-dfff-4468-8bbb-3bc55ae9d089»

## task (10)

### Active Task
*Workflow — manual/on demand*
- set status of **task** → In Progress

### Create Subject For Task
*Workflow, real-time — on create*
- update **task**: subject

### تسک بررسی کننده پاسخ خالی بودن فیلد ورتراگ نومر
*Workflow — on change of new_task_type,new_vertragsnummer*
- update **opportunity**: new_shomareh
- run «فرصت-ایجاد نامه لغو و افزودن به فرصت»
- set status of **task** → Completed

### تسک-کنترل عقب انداختن تسک ها
*Workflow, real-time — on change of scheduledend*
- custom code BayatSoft.MSCRM: BayatSoft.MSCRM.Math.Add
- update **task**: new_count_postpon

### اگر نوع تسک پیگیری تولد بود
*Business rule, real-time*
> Click to add description

### اگر نوع تسک نامه رسیده بود
*Business rule, real-time*
> اگر نوع تسک نامه رسیده بود

### اگر نوع فرم امتیاز بود
*Business rule, real-time*
> Click to add description

### اگر نوع فرم پورسانت بود
*Business rule, real-time*
> اگر نوع فرم پورسانت بود فیلد وضعیت تایید ارسال کد هدیه نمایش داده بشه و اجباری باشه

### اگر نوع فرم خالی بودن فیلد ورتراگ نومر بود
*Business rule, real-time*
> Click to add description

### نوع فرم امضاء مشتری
*Business rule, real-time*
> Click to add description

## annotation (8)

### Build_Gift_Code_Creation
*Workflow, real-time — on create*
- custom code Tarefe: Tarefe.Note.Note_Attachment_Bulk_Gift_Code

### Create_Note_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Delete_Note_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Store Account Logo
*Workflow — on create; on change of subject,filesize,filename; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.Annotation.TakeNoteAndReturnFirstLink
- update **account**: new_iconurl

### Update_Note_To_Syncer
*Workflow — on change of subject,filename,notetext; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Upload File Excel Handler
*Workflow — on create; manual/on demand*
- custom code TB_Upload: TB_Upload.CA.HandleExcelFile

### نوت-بررسی وضعیت های نوت هنگام ایجاد-ارسال به سایت
*Workflow, real-time — on create*
- set status of **incident** → در انتظار پاسخ
- update **incident**: new_status
- custom code TarefeBusiness2: TarefeBusiness2.Annotation.Update_Note_Header
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendDataToSite
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendDataToSite
- set status of **incident** → پاسخ داده شده
- update **incident**: new_status

### نوت-بررسی وضعیت های نوت هنگام ویرایش-ارسال به سایت
*Workflow, real-time — on change of notetext; manual/on demand*
- set status of **incident** → در انتظار پاسخ
- update **incident**: new_status
- custom code TarefeBusiness2: TarefeBusiness2.Annotation.Update_Note_Header
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendDataToSite
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_caseref, new_name)
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendDataToSite
- set status of **incident** → پاسخ داده شده
- update **incident**: new_status

## msdyn_aiconfiguration (7)

### CancelTraining
*Action* · `CancelTraining`

### PublishAIConfiguration
*Action* · `PublishAIConfiguration`

### QuickTest
*Action* · `QuickTest`

### ScheduleTraining
*Action* · `ScheduleTraining`

### Train
*Action* · `Train`

### UnpublishAIConfiguration
*Action* · `UnpublishAIConfiguration`

### UnscheduleTraining
*Action* · `UnscheduleTraining`

## msdyn_aimodel (7)

### BatchPrediction
*Action* · `BatchPrediction`

### Predict
*Action* · `Predict`

### Predict by Reference
*Action* · `PredictByReference`

### PredictionSchema
*Action* · `PredictionSchema`

### SchedulePrediction
*Action* · `SchedulePrediction`

### ScheduleRetrain
*Action* · `ScheduleRetrain`

### UnschedulePrediction
*Action* · `UnschedulePrediction`

## bot (6)

### Pva.Authorize
*Action* · `PvaAuthorize`

### Pva.CreateBotComponents
*Action* · `PvaCreateBotComponents`

### Pva.CreateContentSnapshot
*Action* · `PvaCreateContentSnapshot`

### Pva.DeleteBot
*Action — on create* · `PvaDeleteBot`

### Pva.GetDirectLineEndpoint
*Action* · `PvaGetDirectLineEndpoint`

### Pva.Publish
*Action* · `PvaPublish`

## systemuser (5)

### Create_User_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_userref, new_name)

### Update_User_To_Syncer
*Workflow — on change of new_username,domainname,title,new_password,nickname,middlename,address1_telephone1,lastname,homephone,fullname,firstname,personalemailaddress; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_userref, new_name)

### آیا کاربر به مرخصی رفته؟
*Business rule, real-time*
> Click to add description

### Sales Insights GDPR optout user
*Action* · `GDPROptoutUser`
- update **systemuser**: msdyn_gdproptout  (×2)

### یوزر-باز گرداندن خودش یا جانشینش
*Action* · `User_Check_User_Or_Replace`

## new_customer_sign (5)

### Create Customer Sign Link
*Workflow, real-time — manual/on demand*
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.CreateCustomerSign
- update **new_customer_sign**: new_customer_sign_link

### Create Task For Bachavi When One Hour left after Customer Sign
*Workflow — on change of new_customer_sign*
- create **task** (subject, description, new_customer_sign, regardingobjectid, new_customer, new_task_type, ownerid, prioritycode, scheduledend, scheduledstart, transactioncurrencyid)

### Delete Customer Sign Link
*Workflow, real-time — manual/on demand; called by other processes*
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.DeleteCustomerSign
- update **new_customer_sign**: new_customer_sign_link, new_customer_sign

### Prevent Delete Customer Sign
*Workflow, real-time — on delete*

### Remove Customer Sign from site by Deactive Record
*Workflow, real-time — on change of statecode*
- run «Delete Customer Sign Link»

## email (4)

### Cancel Email
*Workflow, real-time — manual/on demand*
- set status of **email** → Canceled

### Complete Email
*Workflow, real-time — manual/on demand*
- set status of **email** → Completed

### Reopen Email
*Workflow, real-time — manual/on demand*
- set status of **email** → Draft

### Send Email To Site
*Workflow — manual/on demand; called by other processes*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_emailref, new_name)
- set status of **email** → Completed

## msdyn_solutionhistory (3)

### Error Code Visibility
*Business rule, real-time*
> Click to add description

### Exception Message Visibility
*Business rule, real-time*
> Click to add description

### Overwrite Customizations Visibility
*Business rule, real-time*

## bookableresource (3)

### Resource Set Account Field State Rule
*Business rule, real-time*
> Set the state of account field in response to changes to resource type field.

### Resource Set Contact Field State Rule
*Business rule, real-time*
> Set the state of contact field in response to changes to resource type field.

### Resource Set User Field State Rule
*Business rule, real-time*
> Set the state of user field in response to changes to resource type field.

## new_children (3)

### Create_Children_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_childrenref, new_name)

### Delete_Children_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_Children_To_Syncer
*Workflow — on change of new_parent,new_name,new_birthdate,statecode,ownerid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_childrenref, new_name)  (×2)

## new_category (3)

### Create_Category_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_categoryref, new_name)

### Delete_Category_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_Category_To_Syncer
*Workflow — on change of new_different,new_name_kurdi,new_name_germany,new_name_arabi,new_name_russian,new_name_turkish,new_name_english,new_name,new_group,new_description_kordi,new_description_persian,new_description_arabi,new_description_russian,new_description_turkish,new_description_english,new_description_german,new_amount,statecode,ownerid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_categoryref, new_name)

## new_generate_letter (3)

### ایجاد نامه-پر کردن مشخصات مشتری در صورت پر شدن فیلد مشتری
*Workflow, real-time — on create; manual/on demand; called by other processes*
- update **new_generate_letter**: new_firstname, new_lastname, new_street, new_pelak, new_postalcode, new_city, new_email

### پر کردن مشخصات شرکت در صورت پر شدن فیلد شرکت
*Workflow, real-time — on create; manual/on demand; called by other processes*
- update **new_generate_letter**: new_accountname, new_accountstreet, new_accountpelak, new_accountpostalcode, new_accountcity

### Action_Call_Generate_Letter
*Action* · `Action_Call_Generate_Letter`
- custom code Tarefe: Tarefe.Opportunity.Opportunity_GetCancelLetterGenerateAsPdf
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendNoteFileAndTakeFileUrl

## new_receive_letter (3)

### نامه های رسیده- اگر تیک افودن نامه به فرصت خورد
*Workflow, real-time — on change of new_add_note_opportunity*
- custom code Tarefe: Tarefe.Note.Note_Attach_File
- set status of **new_receive_letter** → Inactive

### نامه های رسیده- بررسی مشخصات داخل نامه
*Workflow — on create; manual/on demand*
- custom code TarefeBusiness2: TarefeBusiness2.ReceiveLetter.HandelRecevieLetter
- update **new_receive_letter**: new_opportunityref, new_customer

### نامه های رسیده-ایجاد نوت از روی محتویات فایل
*Workflow — on create; manual/on demand*
- custom code Tarefe: Tarefe.Note.Note_Attach_File

## new_customer_business (3)

### Create_Business_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_businessref, new_name)

### Delete_Business_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_Business_To_Syncer
*Workflow — on change of new_city,new_name,new_customer,new_postalcode,new_street,new_pelak,statecode,ownerid,new_iban,new_email; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_businessref, new_name)  (×2)

## new_tarefe_leters (3)

### Create_TarefeLetter_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_letterref, new_name)

### Delete_TarefeLetter_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_TarefeLetter_To_Syncer
*Workflow — on change of new_letter_type,new_message,new_finance,new_name_kurdish,new_name_persian,new_name_arabi,new_name_rusian,new_name_turkish,new_name_english,new_name,new_trip,new_description_kordi,new_description_persian,new_description_arabi,new_description_russian,new_description_turkish,new_description_english,new_description_german,new_insurance,new_energy,new_telecom,statecode,ownerid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_letterref, new_name)

## knowledgearticle (3)

### Expired Process
*Business process flow — on create* · `expiredprocess`
> This is the default process flow for working Expired KnowledgeArticle.

### New Process
*Business process flow — on create* · `newprocess`
> This is the default process flow for working New KnowledgeArticle.

### Translation Process
*Business process flow* · `translationprocess`
> This is the default process flow for KnowledgeArticle Translations.

## new_contract_company (3)

### Create_ConCom_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Delete_ConCom_To_Syncer
*Workflow, real-time — on delete; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_ConCom_To_Syncer
*Workflow — on change of new_name,statecode,ownerid; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

## account (3)

### Create_Account_To_Syncer
*Workflow — on create; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_customerref, new_name)

### Delete_Account_To_Syncer
*Workflow, real-time — on delete*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

### Update_Account_To_Syncer
*Workflow — on change of new_statuscustomer,new_type,new_ashnaee,new_hamrah,new_countrys,new_number,new_motherlanguage,new_date,new_pelak,telephone3,new_strasse,statecode,new_stadt,new_plz,ownerid,telephone2,telephone1,industrycode,new_iconurl,new_iban,new_hausnummer,emailaddress1,description,new_country,new_bic,address1_telephone1,name; manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_customerref, new_name)

## new_campaign_customer (2)

### Campaign_Customer_Check_Duplicate
*Workflow, real-time — on create; on change of new_customer,new_campaign*
- custom code Tarefe: Tarefe.Campaign.CampaignCustomer_Check_Duplicate

### Fill Name of Campagin_Customer When Create or Change
*Workflow — on create; on change of new_customer,new_campaign*
- update **new_campaign_customer**: new_name

## bs_whatsapp (2)

### Fill Whatsapp Number
*Workflow, real-time — on create; on change of bs_customer*
- update **bs_whatsapp**: bs_whatsapp_number  (×3)

### Send Whatsapp Message
*Workflow, real-time — manual/on demand*
- custom code Bs_Whatsapp: Bs_Whatsapp.CA.SendMessage
- update **bs_whatsapp**: bs_messageid, bs_whatsapp_status
- set status of **bs_whatsapp** → Sent
- update **bs_whatsapp**: bs_developer_desc, bs_messageid

## new_sitesyncer (2)

### Send Site Syncer To Site
*Workflow — on create; manual/on demand*
- custom code TarefeSiteSyncer: TarefeSiteSyncer.CA.SendDataToSite

### Site Syncer Deactive
*Workflow, real-time — manual/on demand*
- set status of **new_sitesyncer** → Inactive

## letter (2)

### Close Letter As Sent
*Workflow, real-time — manual/on demand*
- set status of **letter** → Sent

### پر شدن فرام وتو
*Workflow, real-time — on create; on change of new_opportunityid*
- update **letter**: from, to

## appointment (2)

### قرارملاقات-ساخت نوتیفیکیشن
*Workflow — on create*
- custom code action: new_User_Check_User_Or_Replace
- create **bsnotif_notification** (bsnotif_name, bsnotif_type, bsnotif_for_all_user, bsnotif_user, new_appointment)

### After Meeting
*Business process flow* · `after_meeting`
> Use this task flow to update your appointment and related records after your meeting is over.

## msdyn_odatav4ds (1)

### Set default Timeout 
*Business rule, real-time*
> Sets the default value for the Timeout parameter.

## entitlementchannel (1)

### Disable remaining terms
*Business rule, real-time*
> Business rule to make the remaining terms locked in grid

## topicmodelconfiguration (1)

### Topic Model Configuration Time Filter Rule
*Business rule*
> Topic Model Configuration Time Filter Rule

## bsfulm_fulmakht (1)

### Fulmakht_Fill_Contact_Info
*Workflow, real-time — manual/on demand; called by other processes*
- update **bsfulm_fulmakht**: bsfulm_firstname, bsfulm_fullname, bsfulm_phone, bsfulm_email, bsfulm_street, bsfulm_postalcode, bsfulm_city
- update **bsfulm_fulmakht**: bsfulm_birthday

## workflow (1)

### install
*Action* · `install`

## new_notification (1)

### Create_Notification_To_Syncer
*Workflow — manual/on demand*
- create **new_sitesyncer** (new_type, new_try, new_entityname, new_entityid, new_name)

## contract (1)

### ManageContractState
*Workflow — on create; on change of statecode; manual/on demand*
- if: Wait for status change
- if: Invoiced actions
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateCancelContracts
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateActivateContracts
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateCancelContracts
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.CheckIsOneDay
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateExpireContracts  (×2)

## new_counselor_info (1)

### جزئیات مشاوره - پر کردن تاریخ در صورت خالی بودن
*Workflow, real-time — on create*
- update **new_counselor_info**: new_date

## listoperation (1)

### List Operation Workflow
*Workflow — manual/on demand*
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.ListOperationCodeActivity

## new_gift_code (1)

### Fill Gift Code Name
*Workflow, real-time — on create; on change of new_amount*
- update **new_gift_code**: new_name

## entitlement (1)

### ManageEntitlementState
*Workflow — on create; on change of statecode; manual/on demand*
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateActivateEntitlements
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.CheckIsOneDay
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateExpireEntitlements  (×2)

## contractdetail (1)

### ManageContractLineState
*Workflow — on create; on change of statecode; manual/on demand*
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.CheckIsOneDay
- custom code Microsoft.Dynamics.Service.Workflows: Microsoft.Dynamics.Service.Workflows.UpdateExpireContractLines  (×2)

## bulkoperation (1)

### ActivityPropagation
*Workflow — manual/on demand*
- custom code Microsoft.Dynamics.Marketing.Workflows: Microsoft.Dynamics.Marketing.Workflows.ActivityPropagationOperation

## msdyn_entityrankingrule (1)

### Sales Insights ranking activity
*Workflow — manual/on demand; called by other processes*
- custom code Microsoft.Crm.RI.RASolutionPlugin: Microsoft.Crm.AssistantStudioPlugins.ActionCardRankingActivity
- if: Wait for 2 hrs 58 mins
- run «Sales Insights ranking activity»

## list (1)

### (DEPRECATED) BatchAddMarketingListMembersMasterWorkflow
*Workflow — manual/on demand; called by other processes*
- if: Check running
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.WaitOperation
- custom code Microsoft.Dynamics.Marketing.MarketingListWorkflows: Microsoft.Dynamics.Marketing.MarketingListWorkflows.BatchAddMarketingListMembersOperation
- if: Sleep for 1 hour to overcome infinite loop detection
- run «(DEPRECATED) BatchAddMarketingListMembersMasterWorkflow»
