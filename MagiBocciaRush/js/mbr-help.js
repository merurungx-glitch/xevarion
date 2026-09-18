/* ══════════════════════════════════════════════════════════════
   mbr-help.js — スキル・技の「？」で開く補足（★ 2026-09-18 ご指定）
   ──────────────────────────────────────────────────────────────
   効果の数字は mbr-core.js の台帳（SPECIALS / ACTIVES / PASSIVES / ULTS の d）が正本。
   ここには<b>数字の意味・使いどころ・注意</b>だけを書く（数字を二重に持たない）。
     how  … しくみ（何が起きるか・ふつうの投球と何が違うか）
     when … 使いどころ
     note … 気をつけること
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = (how, when, note) => ({ how, when, note });
  const J = (ja, en) => ({ ja, en });

  const SP = {
    straight: T(
      J("投げた瞬間の向きのばらつき（ブレ）がほとんど無くなり、転がりも少しだけ伸びます。点線どおりの場所へ運ぶためのショットです。",
        "Almost removes the random aim error on release and the ball rolls a touch further — it goes where the dotted line says."),
      J("ジャックのすぐ手前に置きたいとき／狭いすき間を通したいとき。CONTROL が低いキャラほど効果が大きい。",
        "Placing right in front of the jack or threading a narrow gap. Bigger gain on low-CONTROL characters."),
      J("強さ（引く長さ）は自分で決めます。ブレが消えても、引きすぎれば行きすぎます。", "You still choose the power — no scatter doesn't stop you overshooting.")),
    bank: T(
      J("壁で跳ね返ったときに失う勢いが小さくなります。ふつうは壁に当たると大きく減速しますが、BANK は勢いを保ったまま角度を変えられます。反射するたびにゲージも入ります。",
        "Loses much less speed off a rail, so you can change the angle and keep going. Every bank also adds gauge."),
      J("相手のボールがジャックの前をふさいでいるとき、横の壁から回りこんで届かせる。", "When enemy balls block the front of the jack — come round off a side rail."),
      J("勢いが残るぶん、止まる位置は奥になりがち。予測のオレンジの◆（反射点）を目安に。", "Keeps more speed, so it tends to stop deeper. Use the orange ◆ bounce marks in the preview.")),
    curve: T(
      J("投げてから少しのあいだ、コートの中央へ向かって曲がります。速さは変わらず、向きだけが変わります。",
        "For a short time after release the ball bends toward the centre of the court. Speed is unchanged — only the direction."),
      J("正面に相手のボールがあるとき、外側から巻いてジャックへ寄せる。", "When an enemy ball sits dead ahead, swing round it from the outside."),
      J("中央から投げると曲がる向きが小さくなります。端の投球ボックスから投げると大きく効きます。", "From a centre box it barely bends — use an outer throwing box for a strong curve.")),
    powerhit: T(
      J("最大の強さが上がり、当てた相手のボールを大きく押し出します。GUARD（紫の六角形）も壊せます。ゲージを使います。",
        "Raises max power and knocks the ball you hit much further. Also breaks GUARD (purple hexagon). Costs gauge."),
      J("相手がジャックにぴったり寄せたとき、GUARD で固められたとき。", "When the opponent has snuggled up to the jack or locked it with GUARDs."),
      J("自分のボールも勢いよく転がるので、当てたあと遠くへ抜けやすい。", "Your ball keeps rolling hard too — it often runs away after the hit.")),
    softstop: T(
      J("遅くなるほどブレーキが強く効き、ピタッと止まります。当たったときの押し出しは弱めです。",
        "The slower it gets the harder it brakes, so it stops dead. Contact is softer."),
      J("ジャックのすぐそばに『置く』とき。行きすぎを防ぎたい最後の1球。", "Parking right next to the jack — the last ball you can't afford to overshoot."),
      J("相手をどかしたい場面には向きません。", "Not for knocking balls away.")),
    jackpush: T(
      J("ジャックに当てたときの押し出しが大きくなります。ゲージを使います。", "Pushes the jack much further when you hit it. Costs gauge."),
      J("相手のボールが固まっている場所からジャックを自分のボールの近くへ運び、エンドの形をひっくり返す。",
        "Move the jack away from the enemy cluster and next to your own balls — flip the whole end."),
      J("ジャックがコートの端へ寄ると、次の投球が難しくなるのはお互いさまです。", "A jack near the rails makes the next throws hard for everyone.")),
    guard: T(
      J("止まったボールが GUARD になり、このエンドのあいだ重く（押されにくく）なります。", "The ball becomes a GUARD for the end — heavier and hard to push."),
      J("ジャックのすぐ前に置いて『壁』にする。いちばん近い自分のボールを守る。", "Park it in front of the jack as a wall, or to protect your closest ball."),
      J("POWER HIT で当てられると解除されます。", "A POWER HIT breaks it.")),
    split: T(
      J("最初にボールへ当てたあと、横向きの勢いを残して進みます。1投で2つ目のボールも狙えます。ゲージを使います。",
        "After the first hit it keeps some sideways speed, so one throw can reach a second ball. Costs gauge."),
      J("相手のボールが2つ並んでいるとき。", "When two enemy balls sit side by side."),
      J("ジャックに当てた場合は分かれません。", "It doesn't split off the jack.")),
  };

  const ACT = {
    impactbreaker: T(J("この1投で、速い（3m/s 以上）当たりのときだけ押し出しがさらに強くなります。", "This throw: extra push, but only on fast hits (3m/s+)."),
      J("強めに投げて相手のボールをはじくとき。", "Hard knock-outs."), J("ゆっくり当てると効きません。", "No effect on slow contact.")),
    overdrive: T(J("この1投だけ最大の強さが上がります。", "This throw only: higher max power."),
      J("コートの奥までジャックが行ったとき・長い距離の押し出し。", "Deep jacks and long-range knocks."), J("引く長さが同じでも速くなるので、置くショットでは行きすぎに注意。", "Same pull = faster ball, so careful when placing.")),
    perfectline: T(J("この1投だけ、点線の予測が止まる位置まで全部見えます。", "This throw: the preview shows the whole path to the stop point."),
      J("CONTROL が低くて先が見えないキャラの、大事な1球。", "A key throw for low-CONTROL characters."), J("予測は『ブレが無い場合』の線です。ブレは別に入ります。", "The preview assumes no scatter; scatter still applies.")),
    steadyhand: T(J("この1投のブレがゼロになります。", "This throw: zero scatter."),
      J("点線どおりに投げたい決め球。", "When you need the ball exactly on the line."), J("予測の見える長さは変わりません。", "Doesn't lengthen the preview.")),
    crimsonrebound: T(J("壁に当たったあと少しのあいだ、減速がゆるやかになります（勢いを保ちやすい）。", "After a rail hit, the ball brakes less for a moment."),
      J("壁を使って奥へ回りこむとき。", "Rail shots that need to carry deep."), J("壁に当たらなければ何も起きません。", "Nothing happens without a rail hit.")),
    mirrorrail: T(J("この1投、壁の反発が強くなり、予測も反射の先まで伸びます。", "This throw bounces harder off rails and the preview reaches past the bounce."),
      J("反射の角度を正確に読みたいとき。", "Reading bank angles precisely."), J("反発が強いぶん、止まる位置は奥になりがち。", "Stronger bounce = deeper stops.")),
    jackresonance: T(J("この1投でジャックに触れるとゲージが大きく入り、ジャックも少しよく動きます。", "Touching the jack this throw gives big gauge and pushes it a bit more."),
      J("ULT を早くためたいとき。", "Charging the ULT quickly."), J("ジャックに触れなければゲージは入りません。", "No jack contact, no bonus.")),
    jacklock: T(J("次に自分が投げるまで、相手がジャックを動かす力が半分になります（すぐに発動・投げなくても有効）。", "Until your next throw, opponents move the jack only half as far."),
      J("自分がジャックに寄せていて、動かされたくないとき。", "When you're winning around the jack and want it to stay put."), J("自分の次の投球で切れます。", "Ends on your next throw.")),
    guardfield: T(J("使った瞬間に、ジャックの 1m 以内にある自分のボールをまとめて GUARD にします。", "Instantly turns your balls within 1m of the jack into GUARDs."),
      J("ジャックのまわりに自分のボールが集まっているとき。", "When several of your balls surround the jack."), J("このエンドのあいだだけです。", "Lasts only this end.")),
    ironwall: T(J("この1投のボールが、ふつうの GUARD よりさらに重い GUARD になります。", "This throw's ball becomes an extra-heavy GUARD."),
      J("ジャックの前に置く最後の壁。", "The final wall in front of the jack."), J("POWER HIT では解除されます。", "POWER HIT still breaks it.")),
    rallycall: T(J("次に投げる味方のゲージが増え、その1投のブレも小さくなります。", "Your next teammate gains gauge and throws with less scatter."),
      J("次の味方で ULT や大事な1投を決めたいとき。", "Setting up the next teammate's ULT or key shot."), J("効くのは『同じチームの次の1投』だけ。", "Only the team's very next throw.")),
    tacticalread: T(J("この1投とチームの次の1投、予測が止まる位置まで見えます。", "Full preview for this throw and your team's next one."),
      J("2投続けて正確に置きたいとき。", "Two precise placements in a row."), J("ブレは別に入ります。", "Scatter still applies.")),
    phantomspin: T(J("この1投が CURVE（中央へ曲がる）になります。特殊ショットと重ねられます。", "This throw also curves toward the centre; stacks with a special."),
      J("STRAIGHT や POWER HIT と組み合わせて、回りこみながら決める。", "Combine with STRAIGHT or POWER HIT to curl in."), J("中央のボックスから投げると曲がりが小さい。", "Weak curve from the centre box.")),
    shocktap: T(J("この1投で当てたボールが SHOCK になり、すぐ止まるようになります。", "Balls you hit this throw get SHOCK and stop quickly."),
      J("相手のボールを『少しだけ』ずらしたいとき・ジャックを遠くへ行かせたくないとき。", "Nudging balls only a little, or keeping the jack from flying off."), J("自分のボールには付きません。", "Doesn't affect your own ball.")),
  };

  const PAS = {
    momentum: T(J("速い当たり（4m/s 以上）で相手に当てると、ゲージが追加で入ります。", "Fast hits on enemy balls (4m/s+) give extra gauge."), J("はじくショットを多く使う編成で。", "Teams that knock balls a lot."), J("選ばなくても常に効きます。", "Always on — no need to select.")),
    heavyball: T(J("このキャラのボールは少し重く、押されにくく・押しやすくなります。", "This character's balls are a little heavier — harder to move, better at moving others."), J("押し合いになりやすい中盤。", "Mid-end shoving matches."), J("常に効きます。", "Always on.")),
    precisioncore: T(J("ブレがいつも少し小さくなります。", "Always slightly less scatter."), J("どんな場面でも。", "Every throw."), J("常に効きます。", "Always on.")),
    allyfocus: T(J("ジャックの近く（1.2m 以内）に味方のボールがあると、ブレが小さくなります。", "Less scatter while an ally ball is within 1.2m of the jack."), J("味方が先に寄せたあとの2球目以降。", "After a teammate has already got close."), J("味方のボールが離れると効きません。", "Off when no ally is near the jack.")),
    reboundcharge: T(J("壁で反射するたびにゲージが入ります。", "Gauge every time the ball banks."), J("BANK と組み合わせると大きくたまる。", "Huge with BANK."), J("反射は1投で3回まで数えます。", "Counts up to 3 banks per throw.")),
    softrail: T(J("壁に当たったあと止まりやすくなります。", "Brakes harder after a rail hit."), J("壁を使って手前に止めたいとき。", "Rail shots that must stop short."), J("常に効きます。", "Always on.")),
    jacksense: T(J("ジャックに触れるとゲージが追加で入ります。", "Extra gauge on jack contact."), J("JACK PUSH と相性が良い。", "Pairs well with JACK PUSH."), J("常に効きます。", "Always on.")),
    jackgravity: T(J("ジャックの 50cm 以内で止まるとゲージが追加で入ります。", "Extra gauge when stopping within 50cm of the jack."), J("ぴったり寄せるのが得意なキャラで。", "Placement specialists."), J("止まった位置で判定します。", "Judged where the ball stops.")),
    anchor: T(J("このキャラのボールは押されにくくなります。", "This character's balls resist pushes."), J("ジャックのそばに置いた球を守る。", "Protecting balls parked near the jack."), J("常に効きます。", "Always on.")),
    cover: T(J("このボールが触れた味方のボールが軽い GUARD になります。", "Ally balls this ball touches become light GUARDs."), J("味方のボールに軽く当てて固める。", "Tap your own balls to harden them."), J("相手のボールには付きません。", "Never on enemy balls.")),
    teamlink: T(J("ジャックの 1m 以内で止まると、次に投げる味方のゲージが増えます。", "Stopping within 1m of the jack gives the next teammate gauge."), J("ULT を持つ味方の前に置く。", "Put this character just before a ULT user."), J("増えるのは次の味方1人だけ。", "Only the next teammate.")),
    morale: T(J("エンドの最初の1投でゲージが入ります。", "Gauge on your first throw of an end."), J("編成の1番手に置く。", "Lead of the lineup."), J("2投目以降は効きません。", "Only the first throw.")),
    comeback: T(J("相手のほうがジャックに近いとき、1エンド1回だけブレが小さくなり予測も最後まで見えます。", "Once per end while behind: less scatter and a full preview."), J("負けている場面の逆転の1球。", "The comeback throw."), J("自分がリードしているときは発動しません。", "Doesn't trigger while you're ahead.")),
    longroll: T(J("1投で 6m 以上転がるとゲージが入ります。", "Gauge when the ball rolls 6m or more."), J("奥のジャック・壁を使った長い球。", "Deep jacks and long rail shots."), J("転がった距離の合計で判定します。", "Counts total distance rolled.")),
    sakurabloom: T(J("ブレが小さく、ボールが少し重く、当てるとゲージが入る——アカツキだけの特別なパッシブです。", "Less scatter, heavier balls, and gauge on hits — Akatsuki's unique passive."), J("どんな場面でも。", "Every throw."), J("常に効きます。", "Always on.")),
  };

  const ULT = {
    power: T(J("この1投の強さと押し出しが大きく上がり、最初に当てた点から衝撃波が広がってまわりのボールも動かします。", "Much more power and push, and a shockwave from the first impact moves nearby balls."),
      J("ジャックのまわりに相手のボールが固まったとき、まとめて崩す。", "Scatter a tight enemy cluster around the jack."), J("自分のボールも衝撃波で動きます。", "Your own nearby balls get pushed too.")),
    technique: T(J("このキャラの次の2投が、ブレゼロ＋予測が最後まで見える状態になります。", "This character's next two throws have zero scatter and a full preview."),
      J("このエンド・次のエンドで確実に寄せたいとき。", "Guaranteed placements over the coming throws."), J("撃った1投ではなく『次の2投』に効きます。", "Applies to the next two throws, not this one.")),
    bounce: T(J("この1投、最初の3回の反射で勢いをほとんど失いません。反射のゲージも2倍。", "The first three banks lose almost no speed; bank gauge doubled."),
      J("壁を何度も使って裏から回りこむ。", "Multi-rail trick shots from behind."), J("勢いが残りやすいので強く引きすぎない。", "Don't overpull — it keeps its speed.")),
    jack: T(J("ジャックを大きく動かし、止まったあとジャックのまわり（1.5m）の味方をまとめて GUARD にします。", "Big jack push, then your balls within 1.5m of it all become GUARDs."),
      J("ジャックを自分の陣地へ運んで、そのまま固める。", "Drag the jack into your camp and lock it down."), J("ジャックに当てないと GUARD は付きません。", "No jack contact, no guards.")),
    defense: T(J("この1投のあと、コート上の自分のボールが全部 GUARD になります。", "After this throw, every one of your balls on court becomes a GUARD."),
      J("リードしていて、崩されたくないエンドの終盤。", "Late in an end you're winning."), J("POWER HIT では解除されます。", "POWER HIT can still break them.")),
    support: T(J("チームの次の2投が、ゲージ増加・ブレ減少・予測が最後まで、の状態になります。", "Your team's next two throws get gauge, less scatter and full previews."),
      J("味方にエースがいるとき、その前に撃つ。", "Fire it just before your ace throws."), J("自分の投球ではなく『チームの次の2投』に効きます。", "Buffs the team's next two throws, not this one.")),
    trick: T(J("この1投が曲がって分かれ、当てたボールを SHOCK にし、コンボの上限も1つ増えます。", "Curves and splits, SHOCKs what it hits, and raises the combo cap by one."),
      J("相手のボールが複数あるとき、まとめて崩してゲージも稼ぐ。", "Break several enemy balls at once and farm gauge."), J("動きが複雑なので予測の点線をよく見て。", "Complex path — watch the preview closely.")),
  };

  const NORMAL = T(
    J("何も選ばずに投げる、いちばん基本のショットです。強さ・ブレ・転がりやすさは、そのキャラの6つの能力（POWER・CONTROL…）で決まります。",
      "The basic throw with nothing selected. Power, scatter and roll come from the character's six stats."),
    J("特殊ショットを温存したいとき。パッシブは通常ショットでも効きます。", "When saving specials — passives still apply."),
    J("CONTROL が低いほど、点線の見える長さが短く、ブレも大きくなります。", "Lower CONTROL = shorter preview and more scatter."));

  /* ══ ★★ 2026-09-19 追加した技の補足 ══ */
  Object.assign(SP, {
    pinpoint: T(J("ブレを半分にし、点線の見える長さも伸ばします。かわりに全力で投げても少し弱くなります。", "Halves scatter and lengthens the preview, at the cost of a little top power."),
      J("ジャックのすぐ横など、数cm の精度がほしい置きの1球。", "Placement shots where a few centimetres matter."), J("遠くのジャックには届きにくくなります。", "Harder to reach a deep jack.")),
    heavy: T(J("ボールが重くなり、ぶつけたときに相手をよく動かし、自分は押し返されにくくなります。", "A heavier ball that moves others more and is harder to move."),
      J("押し合い・GUARD のそばに置くとき。", "Shoving matches and parking next to GUARDs."), J("少し止まりやすいので、いつもより強めに引く。", "Brakes a bit more, so pull slightly harder.")),
    longdrive: T(J("減速が弱まり、同じ強さでも奥まで転がります。", "Less braking: the same pull rolls much farther."),
      J("コートの奥にあるジャック・遠くの相手ボールを狙うとき。", "Deep jacks or far-away targets."), J("行きすぎやすいので、手前に置く球には向きません。", "Easy to overshoot short placements.")),
    draw: T(J("最初に何かに当たった瞬間、自分の球だけが急に遅くなり、当てた場所の近くに残ります。", "On first contact your own ball slows sharply and stays near the impact."),
      J("相手をどかして、そのままその位置を奪いたいとき（入れかえ）。", "Knock a ball away and take its spot."), J("ジャックに当てても同じように止まります。", "Also stops dead if it hits the jack.")),
    follow: T(J("最初に当てたあと、当たる前の勢いの一部を足して、さらに前へ進みます。", "After the first hit it regains part of its speed and keeps pushing forward."),
      J("手前の球ごと押しこんで、奥のジャックまで届かせたいとき。", "Drive through a front ball to reach the jack."), J("勢いが残るので、行きすぎに注意。", "Keeps momentum, so watch for overshooting.")),
    cushion: T(J("壁に当たったときの跳ね返りが小さくなり、壁ぎわにぴたりと止まります。", "Rail rebounds are damped so the ball stops tight to the rail."),
      J("ジャックが壁ぎわにあるとき。", "When the jack sits against a rail."), J("壁を使って角度を変える球には向きません。", "Not for angled bank shots.")),
    jackkiss: T(J("ジャックに当たってもあまり動かさず、遅くなるとよく止まるので、ジャックに寄りそって止まります。", "Barely moves the jack and brakes hard when slow, so it nestles against it."),
      J("ジャックを動かさずに、いちばん近い場所を取りたいとき。", "Claim the closest spot without moving the jack."), J("相手をはじく力も弱めです。", "Weak at knocking balls away.")),
    doublebank: T(J("最初の2回の壁の反射で勢いを失いません。2回曲げて裏から回りこめます。", "The first two banks keep full speed, so you can curl in from behind."),
      J("正面がふさがれているとき、壁2回で回りこむ。", "When the front is blocked, go round with two banks."), J("ゲージ15を使います。反射点（◆）をよく見て。", "Costs 15 gauge; watch the bounce marks.")),
  });
  Object.assign(ACT, {
    focusaim: T(J("この1投だけ、ブレを大きく減らし、点線も長く見えます。", "This throw only: much less scatter and a longer preview."), J("決め球。特殊ショットと重ねるとさらに正確。", "Your key shot; stacks with specials."), J("強さは自分で決めます。", "You still choose the power.")),
    breakshot: T(J("この1投だけ、押し出しが強くなり、GUARD も壊せます。", "This throw only: stronger push and breaks GUARD."), J("GUARD で固められたジャックを崩すとき。", "Cracking a GUARDed jack."), J("自分の球も遠くへ抜けやすい。", "Your ball may run away too.")),
    anchorshot: T(J("この1投のボールが重くなり、止まると GUARD になります。", "This throw's ball is heavier and becomes a GUARD when it stops."), J("ジャックの前に「壁」を置くとき。", "Building a wall in front of the jack."), J("POWER HIT などで GUARD は壊されます。", "POWER HIT can still break the GUARD.")),
    slipstream: T(J("この1投だけ、減速が弱くなって奥まで届きます。", "This throw only: less braking, reaches deep."), J("遠いジャック・奥の相手球。", "Deep jacks and far targets."), J("行きすぎに注意。", "Watch for overshooting.")),
    brake: T(J("この1投だけ、遅くなるとよく止まり、全体の減速も少し強くなります。", "This throw only: soft braking plus a little more friction."), J("ジャックの手前にぴたりと置くとき。", "Parking right before the jack."), J("遠くまでは届きにくい。", "Hard to reach far.")),
    railboost: T(J("この1投だけ、壁の反発が強く、反射するたびゲージも入ります。", "This throw only: stronger rail rebound and gauge per bank."), J("壁を使う球でゲージもためたいとき。", "Bank shots that also build gauge."), J("勢いが残るので止まる位置は奥になりがち。", "Tends to stop deeper.")),
    chargeup: T(J("この1投でたまるゲージが大きく増えます。", "This throw earns much more gauge."), J("ULT を早く撃ちたいとき。当ててコンボを作るとさらに大きい。", "Charging toward the ULT; even more with hits and chains."), J("効果はゲージだけです。", "Only affects gauge.")),
    doubletap: T(J("この1投だけ、コンボの上限が1つ上がり、ゲージも少し入ります。", "This throw only: combo cap +1 and bonus gauge."), J("壁→ヒット→ジャックのような連続を狙うとき。", "Going for long chains."), J("コンボがつながらないとゲージは少なめ。", "Little gauge without a chain.")),
    guardsweep: T(J("この1投だけ、GUARD を壊し、当てた球をすぐ止まる状態（SHOCK）にします。", "This throw only: breaks GUARD and SHOCKs balls it hits."), J("相手の GUARD を少しだけずらしたいとき。", "Nudging GUARDed balls a little."), J("大きくはじく力は増えません。", "Doesn't add knock-out power.")),
    splitburst: T(J("この1投が SPLIT（当てたあと横へ分かれる）になり、押し出しも少し強くなります。", "This throw also SPLITs and pushes a little harder."), J("相手の球が2つ並んでいるとき。", "Two opposing balls side by side."), J("ジャックに当てた場合は分かれません。", "No split off the jack.")),
  });
  Object.assign(PAS, {
    steadybase: T(J("ブレがいつも少し小さく、少し止まりやすい。", "Always a little less scatter and a little more braking."), J("どの場面でも安定。", "Steady everywhere."), J("常に効きます。", "Always on.")),
    sprinter: T(J("全力で投げたときの強さがいつも少し上がります。", "Always a little more top power."), J("遠いジャック・強いヒット。", "Deep jacks and hard hits."), J("常に効きます。", "Always on.")),
    grip: T(J("いつも止まりやすくなります。", "Always brakes more."), J("置く球が多いキャラに。", "For placement-heavy roles."), J("遠くへは届きにくい。", "Harder to reach far.")),
    glide: T(J("いつもよく転がります。", "Always rolls farther."), J("奥のジャック・長い壁の球。", "Deep jacks and long rail shots."), J("行きすぎに注意。", "Watch for overshooting.")),
    bumper: T(J("壁の反発がいつも少し強い。", "Rail rebound is always a little stronger."), J("壁を使うキャラに。", "For bank-shot users."), J("常に効きます。", "Always on.")),
    impact: T(J("相手のボールをいつも少し強く押し出します。", "Always pushes opposing balls a bit harder."), J("はじく球が多いキャラに。", "For knock-out roles."), J("ジャックへの押し出しは変わりません。", "Doesn't change jack push.")),
    jacktouch: T(J("ジャックをいつも少し強く動かします。", "Always moves the jack a bit more."), J("ジャックを動かして形を変えたいとき。", "Reshaping the end by moving the jack."), J("動かしすぎに注意。", "Easy to move it too far.")),
    bulwark: T(J("ボールが少し重く、ジャックの 50cm 以内で止まると自動で GUARD になります。", "Slightly heavier; stopping within 50cm of the jack makes it a GUARD."), J("ジャックに寄せる球がそのまま守りになる。", "Your close balls become defence."), J("止まった位置で判定します。", "Judged where it stops.")),
    quickcharge: T(J("たまるゲージがいつも少し多い。", "Always earns a bit more gauge."), J("ULT を何度も使いたい編成に。", "For ULT-heavy teams."), J("常に効きます。", "Always on.")),
    lastword: T(J("そのエンドで自分のチームの最後の1球のとき、ブレが半分になり点線も最後まで見えます。", "On your team's last ball of the end: half scatter and a full preview."), J("編成の最後尾に置くと、決め球をまかせられる。", "Put this character last in the order as your closer."), J("最後の1球以外では効きません。", "Only on the last ball.")),
    opener: T(J("そのエンドで自分のチームの最初の1球のとき、ブレが減り点線も最後まで見えます。", "On your team's first ball of the end: less scatter and a full preview."), J("編成の先頭に置いて、最初の1球をジャックの近くへ。", "Lead the order to open close to the jack."), J("最初の1球以外では効きません。", "Only on the first ball.")),
    hunter: T(J("相手のボールに当てるたびゲージが入ります（1投で2回まで）。", "Gauge for each opposing ball you hit (up to 2 per throw)."), J("はじく球でゲージをためたいとき。", "Build gauge by knocking balls."), J("味方やジャックでは入りません。", "Not for allies or the jack.")),
    chainmaster: T(J("コンボの上限が1つ上がり、コンボ×2 以上でゲージが入ります。", "Combo cap +1 and gauge on chains of 2+."), J("壁・ヒット・ジャックを続ける球が得意なキャラに。", "For characters who chain rail, hit and jack."), J("常に効きます。", "Always on.")),
    railsense: T(J("点線の予測がいつも長く見えます。", "The preview is always longer."), J("CONTROL が低めのキャラの弱点を補う。", "Covers for lower CONTROL."), J("ブレそのものは変わりません。", "Scatter itself is unchanged.")),
    calm: T(J("相手のほうがジャックに近いあいだ、ブレが減ります（何度でも）。", "While behind, less scatter, every time."), J("負けている場面の立て直し。", "Steadying when behind."), J("リードしているときは効きません。", "Off while ahead.")),
  });

  window.MBRHelp = { sp: SP, act: ACT, pas: PAS, ult: ULT, normal: NORMAL };
})();
