define(["connectionManager","serverNotifications","events","datetime","dom","imageLoader","loading","globalize","apphost","layoutManager","scrollHelper","dialogHelper","listViewStyle","paper-icon-button-light","emby-button","formDialogStyle","emby-linkbutton"],function(connectionManager,serverNotifications,events,datetime,dom,imageLoader,loading,globalize,appHost,layoutManager,scrollHelper,dialogHelper){"use strict";function syncNow(){require(["localsync"],function(localSync){localSync.sync()})}function renderJob(context,job,dialogOptions){require(["syncDialog"],function(syncDialog){syncDialog.renderForm({elem:context.querySelector(".syncJobFormContent"),dialogOptions:dialogOptions,dialogOptionsFn:getTargetDialogOptionsFn(dialogOptions),readOnlySyncTarget:!0}).then(function(){fillJobValues(context,job,dialogOptions)})})}function getTargetDialogOptionsFn(dialogOptions){return function(targetId){return Promise.resolve(dialogOptions)}}function getJobItemHtml(jobItem,apiClient,index){var nextAction,html="",status=jobItem.Status;"Failed"===status?nextAction="retry":"Cancelled"===status?nextAction="retry":"Queued"===status||"Transferring"===status||"Converting"===status||"ReadyToTransfer"===status?nextAction="cancel":"Synced"!==status||jobItem.IsMarkedForRemoval||(nextAction="remove");var listItemClass="listItem listItem-shaded";layoutManager.tv&&nextAction&&(listItemClass+=" btnJobItemMenu"),layoutManager.tv&&(listItemClass+=" listItem-button");var tagName=layoutManager.tv?"button":"div";html+="<"+tagName+' type="button" class="'+listItemClass+'" data-itemid="'+jobItem.Id+'" data-status="'+jobItem.Status+'" data-action="'+nextAction+'">';var imgUrl;jobItem.PrimaryImageItemId&&(imgUrl=apiClient.getImageUrl(jobItem.PrimaryImageItemId,{type:"Primary",width:80,tag:jobItem.PrimaryImageTag,minScale:1.5})),html+=imgUrl?'<div class="listItemImage" style="background-image:url(\''+imgUrl+"');background-repeat:no-repeat;background-position:center center;background-size: cover;\"></div>":'<i class="md-icon listItemIcon">sync</i>',html+='<div class="listItemBody three-line">',html+='<h3 class="listItemBodyText">',html+=jobItem.ItemName,html+="</h3>",html+="Failed"===jobItem.Status?'<div class="secondary listItemBodyText" style="color:red;">':'<div class="secondary listItemBodyText">',html+=globalize.translate("sharedcomponents#SyncJobItemStatus"+jobItem.Status),"Synced"===jobItem.Status&&jobItem.IsMarkedForRemoval&&(html+="<br/>",html+=globalize.translate("sharedcomponents#RemovingFromDevice")),html+="</div>",html+='<div class="secondary listItemBodyText" style="padding-top:5px;">',html+='<div style="background:#e0e0e0;height:2px;"><div style="background:#52B54B;width:'+(jobItem.Progress||0)+'%;height:100%;"></div></div>',html+="</div>",html+="</div>";"dots-horiz"===appHost.moreIcon?"&#xE5D3;":"&#xE5D4;";return layoutManager.tv||("retry"===nextAction?html+='<button type="button" is="paper-icon-button-light" class="btnJobItemMenu" data-action="'+nextAction+'"><i class="md-icon">&#xE001;</i></button>':"cancel"===nextAction?html+='<button type="button" is="paper-icon-button-light" class="btnJobItemMenu" data-action="'+nextAction+'"><i class="md-icon">&#xE15D;</i></button>':"remove"===nextAction&&(html+='<button type="button" is="paper-icon-button-light" class="btnJobItemMenu" data-action="'+nextAction+'"><i class="md-icon">&#xE15D;</i></button>')),html+="</"+tagName+">"}function renderJobItems(context,items,apiClient){var html="";html+="<h1>"+globalize.translate("sharedcomponents#Items")+"</h1>",html+='<div class="paperList">';var index=0;html+=items.map(function(i){return getJobItemHtml(i,apiClient,index++)}).join(""),html+="</div>";var elem=context.querySelector(".jobItems");elem.innerHTML=html,imageLoader.lazyChildren(elem)}function parentWithClass(elem,className){for(;!elem.classList||!elem.classList.contains(className);)if(elem=elem.parentNode,!elem)return null;return elem}function showJobItemMenu(elem,jobId,apiClient){var action=elem.getAttribute("data-action"),context=parentWithClass(elem,"formDialog"),listItem=parentWithClass(elem,"listItem"),jobItemId=listItem.getAttribute("data-itemid");"retry"===action?retryJobItem(context,jobId,jobItemId,apiClient):"cancel"!==action&&"remove"!==action||cancelJobItem(context,jobId,jobItemId,apiClient)}function cancelJobItem(context,jobId,jobItemId,apiClient){showRemoveConfirm(function(){loading.show(),apiClient.ajax({type:"DELETE",url:apiClient.getUrl("Sync/JobItems/"+jobItemId)}).then(function(){appHost.supports("sync")&&syncNow(),loadJob(context,jobId,apiClient)})})}function retryJobItem(context,jobId,jobItemId,apiClient){showRetryConfirm(function(){apiClient.ajax({type:"POST",url:apiClient.getUrl("Sync/JobItems/"+jobItemId+"/Enable")}).then(function(){appHost.supports("sync")&&syncNow(),loadJob(context,jobId,apiClient)})})}function showRetryConfirm(callback){require(["confirm"],function(confirm){confirm({text:globalize.translate("sharedcomponents#ConfirmRemoveDownload"),confirmText:globalize.translate("sharedcomponents#RemoveDownload"),cancelText:globalize.translate("sharedcomponents#KeepDownload"),primary:"cancel"}).then(callback)})}function showRemoveConfirm(callback){require(["confirm"],function(confirm){confirm({text:globalize.translate("sharedcomponents#ConfirmRemoveDownload"),confirmText:globalize.translate("sharedcomponents#RemoveDownload"),cancelText:globalize.translate("sharedcomponents#KeepDownload"),primary:"cancel"}).then(callback)})}function fillJobValues(context,job,editOptions){var selectProfile=context.querySelector("#selectProfile");selectProfile&&(selectProfile.value=job.Profile||"");var selectQuality=context.querySelector("#selectQuality");selectQuality&&(selectQuality.value=job.Quality||"");var chkUnwatchedOnly=context.querySelector("#chkUnwatchedOnly");chkUnwatchedOnly&&(chkUnwatchedOnly.checked=job.UnwatchedOnly);var chkSyncNewContent=context.querySelector("#chkSyncNewContent");chkSyncNewContent&&(chkSyncNewContent.checked=job.SyncNewContent);var txtItemLimit=context.querySelector("#txtItemLimit");txtItemLimit&&(txtItemLimit.value=job.ItemLimit);var txtBitrate=context.querySelector("#txtBitrate");job.Bitrate?txtBitrate.value=job.Bitrate/1e6:txtBitrate.value="";var target=editOptions.Targets.filter(function(t){return t.Id===job.TargetId})[0],targetName=target?target.Name:"",selectSyncTarget=context.querySelector("#selectSyncTarget");selectSyncTarget&&(selectSyncTarget.value=targetName)}function loadJob(context,id,apiClient){loading.show(),apiClient.getJSON(apiClient.getUrl("Sync/Jobs/"+id)).then(function(job){apiClient.getJSON(apiClient.getUrl("Sync/Options",{UserId:job.UserId,ItemIds:job.RequestedItemIds&&job.RequestedItemIds.length?job.RequestedItemIds.join(""):null,ParentId:job.ParentId,Category:job.Category,TargetId:job.TargetId})).then(function(options){_jobOptions=options,renderJob(context,job,options),loading.hide()})}),apiClient.getJSON(apiClient.getUrl("Sync/JobItems",{JobId:id,AddMetadata:!0})).then(function(result){renderJobItems(context,result.Items,apiClient),loading.hide()})}function loadJobInfo(context,job,jobItems,apiClient){renderJobItems(context,jobItems,apiClient),loading.hide()}function saveJob(context,id,apiClient){loading.show(),apiClient.getJSON(apiClient.getUrl("Sync/Jobs/"+id)).then(function(job){require(["syncDialog"],function(syncDialog){syncDialog.setJobValues(job,context),apiClient.ajax({url:apiClient.getUrl("Sync/Jobs/"+id),type:"POST",data:JSON.stringify(job),contentType:"application/json"}).then(function(){appHost.supports("sync")&&syncNow(),loading.hide(),dialogHelper.close(context)})})})}function startListening(apiClient,jobId){var startParams="0,1500";startParams+=","+jobId,apiClient.isWebSocketOpen()&&apiClient.sendWebSocketMessage("SyncJobStart",startParams)}function stopListening(apiClient){apiClient.isWebSocketOpen()&&apiClient.sendWebSocketMessage("SyncJobStop","")}function bindEvents(context,jobId,apiClient){context.querySelector(".jobItems").addEventListener("click",function(e){var btnJobItemMenu=dom.parentWithClass(e.target,"btnJobItemMenu");btnJobItemMenu&&showJobItemMenu(btnJobItemMenu,jobId,apiClient)})}function showEditor(options){function onSyncJobMessage(e,apiClient,msg){loadJobInfo(dlg,msg.Job,msg.JobItems,apiClient)}var apiClient=connectionManager.getApiClient(options.serverId),id=options.jobId,dlgElementOptions={removeOnClose:!0,scrollY:!1,autoFocus:!1};layoutManager.tv?dlgElementOptions.size="fullscreen":dlgElementOptions.size="medium";var dlg=dialogHelper.createDialog(dlgElementOptions);dlg.classList.add("formDialog");var html="";html+='<div class="formDialogHeader">',html+='<button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1"><i class="md-icon">&#xE5C4;</i></button>',html+='<h3 class="formDialogHeaderTitle">',html+=globalize.translate("sharedcomponents#Sync"),html+="</h3>",appHost.supports("externallinks")&&(html+='<a href="https://github.com/MediaBrowser/Wiki/wiki/Sync" target="_blank" is="emby-linkbutton" class="button-link lnkHelp" style="margin-top:0;display:inline-block;vertical-align:middle;margin-left:auto;"><i class="md-icon">info</i><span>'+globalize.translate("sharedcomponents#Help")+"</span></a>"),html+="</div>",html+='<div class="formDialogContent smoothScrollY" style="padding-top:2em;">',html+='<div class="dialogContentInner dialog-content-centered">',html+='<form class="syncJobForm" style="margin: auto;">',html+='<div class="syncJobFormContent"></div>',html+='<div class="jobItems"></div>',html+='<div class="formDialogFooter">',html+='<button is="emby-button" type="submit" class="raised button-submit block formDialogFooterItem"><span>'+globalize.translate("sharedcomponents#Save")+"</span></button>",html+="</div>",html+="</form>",html+="</div>",html+="</div>",dlg.innerHTML=html;var submitted=!1;dlg.querySelector("form").addEventListener("submit",function(e){return saveJob(dlg,id,apiClient),e.preventDefault(),!1}),dlg.querySelector(".btnCancel").addEventListener("click",function(){dialogHelper.close(dlg)}),layoutManager.tv&&scrollHelper.centerFocus.on(dlg.querySelector(".formDialogContent"),!1),loadJob(dlg,id,apiClient),bindEvents(dlg,id,apiClient);var promise=dialogHelper.open(dlg);return startListening(apiClient,id),events.on(serverNotifications,"SyncJob",onSyncJobMessage),promise.then(function(){return stopListening(apiClient),events.off(serverNotifications,"SyncJob",onSyncJobMessage),layoutManager.tv&&scrollHelper.centerFocus.off(dlg.querySelector(".formDialogContent"),!1),submitted?Promise.resolve():Promise.reject()})}var _jobOptions;return{show:showEditor}});