(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.C19OccurrenceModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function positive(value,fallback){
    var number=Number(value);
    return Number.isInteger(number)&&number>0?number:fallback;
  }

  function normalizeSearch(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }

  function matchesCatalogue(input){
    var searchText=normalizeSearch(input.searchText);
    var query=normalizeSearch(input.query);
    return(!query||searchText.includes(query))&&(!input.selectedTarget||input.target===input.selectedTarget);
  }

  function uniqueCodes(values){
    return Array.from(new Set((Array.isArray(values)?values:[]).map(function(value){return String(value||'').trim()}).filter(Boolean)));
  }

  function collectPublicRequirements(profiles){
    return uniqueCodes((profiles||[]).reduce(function(codes,profile){return codes.concat(profile&&profile.publics||[])},[]));
  }

  function copyProfile(source,index){
    return{
      index:index,
      label:String(source.label||''),
      duration:positive(source.duration,120),
      target:String(source.target||''),
      publics:uniqueCodes(source.publics),
      location:String(source.location||''),
      room:String(source.room||''),
      entryService:String(source.entryService||''),
      provenance:String(source.provenance||'')
    };
  }

  function normalizeProfiles(definition,count){
    var total=positive(count,1);
    var seed={
      label:definition.label,
      duration:definition.duration,
      target:definition.target,
      publics:definition.publics,
      location:definition.location,
      room:definition.room,
      entryService:definition.entryService,
      provenance:definition.provenance||definition.source&&definition.source.provenance
    };
    var existing=Array.isArray(definition.occurrenceProfiles)?definition.occurrenceProfiles:[];
    var first=copyProfile(existing[0]||seed,1);
    var profiles=[];
    for(var index=1;index<=total;index+=1){
      profiles.push(copyProfile(existing[index-1]||first,index));
    }
    return profiles;
  }

  function buildSessions(input){
    var profiles=input.profiles||[];
    var sessions=positive(input.sessions,1);
    var numbered=input.numberOccurrences!==false;
    var rows=[];
    var labels=profiles.map(function(profile){return profile.label;});
    var duplicateLabels=new Set(labels.filter(function(label,index){return labels.indexOf(label)!==index;}));
    profiles.forEach(function(profile,occurrenceIndex){
      for(var sessionIndex=1;sessionIndex<=sessions;sessionIndex+=1){
        var label=profile.label;
        if(numbered)label+=' '+(sessions>1?(occurrenceIndex+1)+'.'+sessionIndex:String(occurrenceIndex+1));
        else if(duplicateLabels.has(label)&&profiles.length>1)label+=' '+(occurrenceIndex+1);
        rows.push({
          occurrence:occurrenceIndex+1,
          session:sessionIndex,
          label:label,
          duration:profile.duration,
          target:profile.target,
          publics:profile.publics.slice(),
          location:profile.location,
          room:profile.room,
          entryService:profile.entryService,
          provenance:profile.provenance
        });
      }
    });
    return rows;
  }

  function buildPlanningSessions(input){
    var definition=input.definition||{};
    var annual=input.annual||{};
    var profiles=normalizeProfiles(definition,annual.occurrences||definition.occurrences).map(function(profile){
      return Object.assign({},profile,{
        target:annual.target||profile.target,
        publics:uniqueCodes(Array.isArray(annual.publics)?annual.publics:profile.publics),
        location:annual.location||profile.location,
        room:Object.prototype.hasOwnProperty.call(annual,'room')?annual.room:profile.room,
        entryService:Object.prototype.hasOwnProperty.call(annual,'entryService')?annual.entryService:profile.entryService,
        provenance:annual.provenance||profile.provenance
      });
    });
    return buildSessions({profiles:profiles,sessions:definition.sessions,numberOccurrences:definition.numberOccurrences}).map(function(row){
      return Object.assign({},row,{
        id:String(definition.uid||definition.code||'definition')+':'+row.occurrence+':'+row.session,
        definitionUid:String(definition.uid||''),
        code:String(definition.code||''),
        statCom:String(definition.statCom||''),
        domain:String(definition.domain||''),
        family:String(definition.family||''),
        type:String(definition.type||''),
        roles:uniqueCodes(definition.roles),
        resources:uniqueCodes(definition.resources),
        permutation:Boolean(definition.permutation),
        dayExclusive:Boolean(definition.dayExclusive),
        fixedDate:Boolean(definition.fixedDate),
        priorityClass:String(definition.priorityClass||'NORMAL')
      });
    });
  }

  function calendarRules(definition){
    var result={priorityWeekdays:[],secondaryWeekdays:[],forbiddenWeekdays:[],dayStatuses:Object.assign({},definition&&definition.dayStatuses||{})};
    Object.keys(definition&&definition.rules||{}).forEach(function(day){
      var value=String(definition.rules[day]||'ALLOWED').toUpperCase();
      if(value==='PRIORITY')result.priorityWeekdays.push(day);
      else if(value==='SECONDARY')result.secondaryWeekdays.push(day);
      else if(value==='FORBIDDEN')result.forbiddenWeekdays.push(day);
    });
    return result;
  }

  function normalizeAnnouncement(source,index){
    var occurrence=positive(source&&source.occurrence,null);
    var session=positive(source&&source.session,null);
    return{
      id:String(source&&source.id||'announcement-'+index),
      date:String(source&&source.date||''),
      label:String(source&&source.label||'').trim(),
      definitionUid:String(source&&source.definitionUid||''),
      occurrence:occurrence,
      session:session,
      state:'ANNOUNCED',
      linkedActivityId:String(source&&source.linkedActivityId||'')
    };
  }

  function normalizeAnnouncements(rows){
    var ids=new Set();
    return(Array.isArray(rows)?rows:[]).map(normalizeAnnouncement).filter(function(row){
      if(!row.id||!row.label||!/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/.test(row.date)||ids.has(row.id))return false;
      ids.add(row.id);
      return true;
    });
  }

  function saveAnnouncement(rows,input,idFactory){
    var list=normalizeAnnouncements(rows);
    var value=normalizeAnnouncement(Object.assign({},input,{id:input&&input.id||idFactory()}),list.length+1);
    var index=list.findIndex(function(row){return row.id===value.id;});
    if(index<0)list.push(value);else list[index]=value;
    return list;
  }

  function removeAnnouncement(rows,id){
    return normalizeAnnouncements(rows).filter(function(row){return row.id!==id;});
  }

  function announcementsOnDate(rows,date){
    return normalizeAnnouncements(rows).filter(function(row){return row.date===date;});
  }

  return{normalizeProfiles:normalizeProfiles,buildSessions:buildSessions,buildPlanningSessions:buildPlanningSessions,calendarRules:calendarRules,normalizeSearch:normalizeSearch,matchesCatalogue:matchesCatalogue,uniqueCodes:uniqueCodes,collectPublicRequirements:collectPublicRequirements,normalizeAnnouncements:normalizeAnnouncements,saveAnnouncement:saveAnnouncement,removeAnnouncement:removeAnnouncement,announcementsOnDate:announcementsOnDate};
});
