/** World time-zone abbreviations (lowercase). Only these unknown tokens may be reported to analytics. */
export const KNOWN_TZ_ABBRS: ReadonlySet<string> = new Set(
  (
    'acdt acst act adt aedt aest aft akdt akst almt amst amt anat aqtt art ast awst azost azot azt bdt biot bit bot ' +
    'brst brt bst btt cat cct cdt cest cet chadt chast chost chot chst cist ckt clst clt cost cot cst ct cvt cwst cxt ' +
    'davt ddut dft easst east eat ect edt eest eet egst egt est et fet fjt fkst fkt fnt galt gamt get gft gilt gmt gst ' +
    'gyt hdt hkt hmt hovst hovt hst ict idlw idt iot irdt irkt irst ist jst kalt kgt kost krat kst lhst lint magt mart ' +
    'mawt mdt met mest mht mist mit mmt msk mst mut mvt myt nct ndt nft novt npt nst nt nut nzdt nzst omst orat pdt ' +
    'pet pett pgt phot pht pkt pmdt pmst pont pst pt pwt pyst pyt ret rott sakt samt sast sbt sct sdt sgt slst sret ' +
    'srt sst syot taht tft tjt tkt tlt tmt trt tot tvt ulat ulast utc uyst uyt uzt vet vlat volt vost vut wakt wast ' +
    'wat west wet wib wit wita wst yakt yekt'
  ).split(' '),
);
