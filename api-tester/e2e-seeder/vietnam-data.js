const faker = require('@faker-js/faker').fakerVI; // Vietnamese locale
if (!faker.internet.username) faker.internet.username = faker.internet.userName;

// Image pools carefully curated from Unsplash (expanded)
const IMAGE_POOLS = {
  STAY: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127763/admin-uploads/seeder/e2ca567ab73a1b59194332c46b2afdc2d7019c5be414f6cf10f39e69d04daf3d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127845/admin-uploads/seeder/985f6a4d0a1e34e2a69361e94160567bd003c42649d24f0aaff760f511999779.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127846/admin-uploads/seeder/a3bb132505d3f21f8b124f7dba2f1f128622f9686df25d7e910cae1f9bb22771.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127848/admin-uploads/seeder/2a8d46b1947ff79a6c8e4319fe6ceaf75197d3b7c3abb600c6cfaadd6f9aa668.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127849/admin-uploads/seeder/21c90f19e44b0d24dea11876acdcaec46f1fc38c9695be58a79e5188ae263ade.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127850/admin-uploads/seeder/c857b931b5892bee476e9bee7ab98772541d61106f5ae81586f2c2284804687e.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127852/admin-uploads/seeder/fb3ba8206c15a2444cf4eaa02475551b97719ec1b0831ba8d22322cb3542357b.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127853/admin-uploads/seeder/21a23e8cc11b45da5db0bdbbd5f8b5fec49bb5493207196195f28d1c69745d6d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127854/admin-uploads/seeder/5eba8fc29735d8c98df810d453d2323319c465557244dd88a8ce064f6336b4d3.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127855/admin-uploads/seeder/7b10f1a459a5e9092a4c1afeec653e4f5e9c934f276c0404b4ccaedfa79dbb82.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127857/admin-uploads/seeder/eb0f7d4cc7365ee3b95baa2ba1fe27f52f13a37ff55fff15f88bf021aeb8f0a8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127858/admin-uploads/seeder/935c1e17b2f3a9b29903ecd099ded4cb3507aa5fd997a323b79d9c3a1176ace8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127858/admin-uploads/seeder/c3fe51a46800898fcb488c0d953ad404316bcec7fd3667026f722146745ac91c.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127860/admin-uploads/seeder/7d190fc83c214e5620c4a7792a1399a7f3afed0121d684c9c6572df09ff17e98.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127861/admin-uploads/seeder/8c7a26cd296d45764ad089004571972bae29625523521d978c2c8c90e9cf17d9.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127862/admin-uploads/seeder/abd72ef561f34073947a65ce673357ced32812d6899101d1be161c54b53092c8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127864/admin-uploads/seeder/79f92adcf52589acd6300f9cea3bf6c43ab67e47de6753cc7bdb69da308bd805.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127865/admin-uploads/seeder/1de565696a5dff542b437184a5d7c1ca94dd1c99b92437c509b73b39c0034c4b.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127866/admin-uploads/seeder/2f58e4f1b4561bf6de776f7e09e78f5bafea5abdaab11134174f9011ce62115d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127868/admin-uploads/seeder/7e17af6edc1b48f2fbb725a675ba178bcd481ea926bc12404f7c3974834227cf.webp',
  ],
  EXP: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127868/admin-uploads/seeder/eeac9c054aa41a313df9fd7029c85d29252a3e13678fddd9001c6112ec614849.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127878/admin-uploads/seeder/75b59b4a808bc4748f21d00a4d3756385e1207d51539feda18959fa58bf64b4f.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127878/admin-uploads/seeder/b69accb44a56d96f2f13352ca83cedf4d30b8ddec159fc9fb0d2bb9584d71a5e.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127880/admin-uploads/seeder/9bdd4b747432176c353f4b876f96704c516e881822a19da31fa175a75cd60502.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127881/admin-uploads/seeder/8608fc8ae593067edf8d184c91eabbdb6bea1364a5a840dbf4430863f14e9b2e.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127889/admin-uploads/seeder/1d77e1728bb2c4f7a6ff52d6782231d23cf7731f04b384a176d6817a3e30fdb8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127891/admin-uploads/seeder/d0d48137d1183713c502e5c09ab4992673befb382116e74a2856ac2b10fb6075.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127892/admin-uploads/seeder/4158ebff2bf4366603d40747d2c6a259ab508215d826a2937c06f27c1ce974e5.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127895/admin-uploads/seeder/ae4a8b6124e84cc5ea7d072e71b64a4459633db5c3f11da6717491fe5a6fecb5.webp',
  ],
  SVC: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127894/admin-uploads/seeder/341c572b86619b7221de138a9738df899b0ee781bc6f02383f242c5ca4dcdda3.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127898/admin-uploads/seeder/965be973a2dbae8c28152c52cac26c5ab2c318cde95965bf530d14cb96a0ec4d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127900/admin-uploads/seeder/b32403955a3e975a1470112aba6d0ea3bd5938de500c2660d1536ede834f175d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127902/admin-uploads/seeder/1207d21f77266f2ba08301cd7f1a87a86d03f2a031c0dc8e167afa3a0b43a9c2.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127902/admin-uploads/seeder/28f9b27d25922f8a75c890fda7604b68f49c3ae1df4a1931ac1104b8ff33954e.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127904/admin-uploads/seeder/e29bcc941d9c70d148dcbe6406dc9e880865dc28dc88d908096b438e054e29a9.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127905/admin-uploads/seeder/ac6822f6af3d07f0c737ea64ac6e7ced2fa9e8de80d75089d7b2962e183ca881.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/b3443af57b7b68d51e9a024f2977e3a4a6497dc74358dcb61839d56ccd6fbdac.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/e7ea641d405c1d48e594e483e9efef104997ecee84846a1061f96aa7b0079c6f.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127912/admin-uploads/seeder/c14e7e529d1d9fd8a98119143f8a821a027a79caf723f7a199e7b089a6e5aa96.webp',
  ],
  LANDMARK: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127917/admin-uploads/seeder/4be1363ca87bf8c4fa7a1d925f24ca5fe2a029bf8c2dbb2404558852ac6a2af8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127921/admin-uploads/seeder/8d58da156797f9eec32c83ae06d8b6ee144a1fce9ddfb09a355219d0583e9610.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127923/admin-uploads/seeder/984d9513f167dde469708362d58e993c9e76235c259da493ed3d4244da5a8d67.webp',
  ],
  AVATAR: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127924/admin-uploads/seeder/03575031ea0ede23c47aa6af9f1433e18a0c765a96f8656c9f12cb0ca232d8b5.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127925/admin-uploads/seeder/b0ed1792a91627be619a6082c8c975c88b9df307b1216758ce9bec08aba50d74.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127925/admin-uploads/seeder/51fb160991f1c55da81d5fb58c34a5d8922ace545f671e6addc5354a6a1aab29.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127926/admin-uploads/seeder/71f3aef1e0ff706037f27d602ba8fbaa8899fbb5e343d9af9cb59e60ccbc2407.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127927/admin-uploads/seeder/f1b955ff2c8d4a5889bd643fed024f610e5cb9fb49c61636523c15f0f9d858ca.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127927/admin-uploads/seeder/73223aaa9210cacc2c49bb70b483c216bfa610e7240dda93fd6bffc4398b85c8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127928/admin-uploads/seeder/2ab73a7ef2e37742a3b7ff5176bd7f4066fccb20d6ddd38ff730cf0f20bac221.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127929/admin-uploads/seeder/91e64b75b7f777ac446741cd0a05bea6378fb01bd229d0b3e365ef594a97ce0a.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127929/admin-uploads/seeder/e5e791637805b875b0692b2d778a44b05d382e1b754fc00897d50d2594749a1a.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127930/admin-uploads/seeder/751c76133764b92d2dc474d5fa5542a2dd503750db67517a54bc60ab12813c37.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127931/admin-uploads/seeder/9672ebcdf442cca8be817a8eb20c2331e1752bdb5271eade17c969a5b5cc9c0a.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127932/admin-uploads/seeder/a1731813bf41220f06868c862dddce30de87c9df92d5268668277c4fe461d6d7.webp',
  ],
  COMPLEX: [
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127933/admin-uploads/seeder/157682e9654bf950caae5c33f27917e2d9e74cda0debf35ce89b5a1e628d9f27.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127934/admin-uploads/seeder/b94cc671da48d4ae22115932f9973b85c313879e6684579deb03b00086aeda1d.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127936/admin-uploads/seeder/844d38843e927d21afba66322a925d26deb2f7f5e734355a5f78fd6a25952611.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127936/admin-uploads/seeder/75c9678e8eba829f1a67a94d8e9790662d8a1cad5738ed7a4d32376da94d4605.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127938/admin-uploads/seeder/2f9cd7f6ef6949baf9ae4d7b8df490304d7f8c2691f47c7fbeb8e9860d9ae64a.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127938/admin-uploads/seeder/d58abb88c25faa93f17b972bbda6c3e40089d91310741ea663b34e5cdc8c7f28.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127940/admin-uploads/seeder/ebf8b28ffe3a9d83e8555f9e127a5628c93fc9eae0151d1a67c93e9803886d4a.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127941/admin-uploads/seeder/b331eb3fd6a2fba1f10c1ade2ca62c287adff4c495e055cd92cd4489559823e8.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127944/admin-uploads/seeder/0f297e1d0e08e31a2f57fb019d92d2ce75008d12fe264090aebc6674e3f6d7cb.webp',
    'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127944/admin-uploads/seeder/845a1160351904e575ea9ca9c5f179315dcef842f56cb29efa269414ffdffd96.webp',
  ]
};

const LISTING_IMAGE_POOLS = {
  STAY: IMAGE_POOLS.STAY,
  EXP: IMAGE_POOLS.EXP,
  SVC: {
    PHOTOGRAPHY: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127946/admin-uploads/seeder/fc854f34a4344cb57d442405f26e1166c88df502abb19d39de0268d9aaa4a526.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127947/admin-uploads/seeder/aeaa0b216c4b979941389aa4e1e9f935ff5c66809b139ac7f546a515c8694e54.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127949/admin-uploads/seeder/4c2ee638af9ca5c1650d84dfaab1536ec48e3b70b487fbfadec379d88b81e5ce.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127951/admin-uploads/seeder/76db518fe6058c3f5278d937920f24841ec2c64616f9784938ecf9c295e2f916.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127950/admin-uploads/seeder/cc60b311c1fb14a2e1535dd5e4af2427a8465852c5ceb8482b0ca73bc8125dd0.webp',
    ],
    CHEF: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127952/admin-uploads/seeder/f2fc40c2b8420151289176497b3c2ab4db285cec60403dc58de2de12ce80a822.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127953/admin-uploads/seeder/80e15facadf11cd0dc578deb2214e05c3d3f3c2f704f24f3b0f76f311448a7f9.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127954/admin-uploads/seeder/d2c59682914dddb4da0164008fe2da2a9913d777dd1c03372e6baf3c72c93e3c.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127956/admin-uploads/seeder/674f95bc50df169badbdb71139f86a99c591b2533d0579e0186dfa9c59bc006f.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127959/admin-uploads/seeder/155b7a54dc64368bb9c3b5faef5111cf56637c72cdea27ae3c8beaffe20e274e.webp',
    ],
    MASSAGE: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127898/admin-uploads/seeder/965be973a2dbae8c28152c52cac26c5ab2c318cde95965bf530d14cb96a0ec4d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127900/admin-uploads/seeder/b32403955a3e975a1470112aba6d0ea3bd5938de500c2660d1536ede834f175d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127957/admin-uploads/seeder/b40d6822415c02cc0bfc6c304f5348a8fe6f3d54ec2a92395666f8d5c52bcc91.webp',
    ],
    PREPARED_MEALS: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127954/admin-uploads/seeder/d2c59682914dddb4da0164008fe2da2a9913d777dd1c03372e6baf3c72c93e3c.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127956/admin-uploads/seeder/674f95bc50df169badbdb71139f86a99c591b2533d0579e0186dfa9c59bc006f.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127959/admin-uploads/seeder/155b7a54dc64368bb9c3b5faef5111cf56637c72cdea27ae3c8beaffe20e274e.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp',
    ],
    TRAINING: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127962/admin-uploads/seeder/252afa3f97b01b02aad85a33a2203eabdca917800b895bb487c09a3cd0636db8.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127962/admin-uploads/seeder/5c0c009efb3b9ef07cb5c35a2f7f50f08b25a118dc42c565e78403713456287f.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127963/admin-uploads/seeder/7d81dfcc3003399d0eec16ee9891a17c34f822200ea2109c213ba5976cd20f7d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127964/admin-uploads/seeder/5f6f3be223f1e1d2d675c9e84d8546f350dc824fc5573f6d5412185cb2236777.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127966/admin-uploads/seeder/ce9d084ceeed9391e3582feaec236fc552fcd236b2fed464dbf32a0dc3bf192b.webp',
    ],
    MAKEUP: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127902/admin-uploads/seeder/1207d21f77266f2ba08301cd7f1a87a86d03f2a031c0dc8e167afa3a0b43a9c2.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127912/admin-uploads/seeder/c14e7e529d1d9fd8a98119143f8a821a027a79caf723f7a199e7b089a6e5aa96.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127902/admin-uploads/seeder/28f9b27d25922f8a75c890fda7604b68f49c3ae1df4a1931ac1104b8ff33954e.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127904/admin-uploads/seeder/e29bcc941d9c70d148dcbe6406dc9e880865dc28dc88d908096b438e054e29a9.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127905/admin-uploads/seeder/ac6822f6af3d07f0c737ea64ac6e7ced2fa9e8de80d75089d7b2962e183ca881.webp',
    ],
    HAIR_STYLING: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/e7ea641d405c1d48e594e483e9efef104997ecee84846a1061f96aa7b0079c6f.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127966/admin-uploads/seeder/4679211dd1a4bc95adaadce2ebe35e44294b6652ba1a92bf210da59f6a7e2c4d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127969/admin-uploads/seeder/578f3f851cf7a34a2afb896d8ec2218793d8fead64a3ebaff5804e68776e2ddd.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127902/admin-uploads/seeder/28f9b27d25922f8a75c890fda7604b68f49c3ae1df4a1931ac1104b8ff33954e.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127912/admin-uploads/seeder/c14e7e529d1d9fd8a98119143f8a821a027a79caf723f7a199e7b089a6e5aa96.webp',
    ],
    SPA: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127900/admin-uploads/seeder/b32403955a3e975a1470112aba6d0ea3bd5938de500c2660d1536ede834f175d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127957/admin-uploads/seeder/b40d6822415c02cc0bfc6c304f5348a8fe6f3d54ec2a92395666f8d5c52bcc91.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127898/admin-uploads/seeder/965be973a2dbae8c28152c52cac26c5ab2c318cde95965bf530d14cb96a0ec4d.webp',
    ],
    CATERING: [
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127969/admin-uploads/seeder/7c4a134ffe05c2b651cfb6da9c009ad3f5a117d3bd02e8a2fdcbd07aa68b4ffe.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127971/admin-uploads/seeder/5f700f7c17e2cde3349ffd37e6a511a53ccb3289485d91e908bcaa375f808af5.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127972/admin-uploads/seeder/7d09f54dc7568601651035b654b64ea6138f16c3147be8e1dc68320d33548407.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127973/admin-uploads/seeder/adf0a8bfadf06b4f2e66a72747446c0f41f02d688b7f77321285cb5bbb2adf0d.webp',
      'https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127894/admin-uploads/seeder/341c572b86619b7221de138a9738df899b0ee781bc6f02383f242c5ca4dcdda3.webp',
    ],
  },
};

// 30 provinces with realistic famous landmarks across Vietnam
const PROVINCES_AND_LANDMARKS = [
  {
    "province": "Hà Nội",
    "landmarks": [
      {
        "name": "Hồ Hoàn Kiếm",
        "lat": 21.028779,
        "lng": 105.852437,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127975/admin-uploads/seeder/c6bc92e5158875c93897512abc1a1ecd30352a8e251e3bf4b4840e8f61d77a68.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp"
        ]
      },
      {
        "name": "Văn Miếu Quốc Tử Giám",
        "lat": 21.028071,
        "lng": 105.835536,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127981/admin-uploads/seeder/ca3971552ad49590db8517f2848278d76bb1d379cbdf86ae53d0c92896fdee49.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Lăng Chủ tịch Hồ Chí Minh",
        "lat": 21.036873,
        "lng": 105.834667,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127985/admin-uploads/seeder/45b95a2eab7d5aa3e506388c9c68ea27c518cee9c99a60ec5fabce1634f0c272.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127916/admin-uploads/seeder/1f3106cead1a33834a8e17dfd904551ef7745bb359568cb0c3816396207c86f3.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Hồ Chí Minh",
    "landmarks": [
      {
        "name": "Chợ Bến Thành",
        "lat": 10.772129,
        "lng": 106.698278,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127984/admin-uploads/seeder/a150b13d34f620e0b45cec8521fc3e63b97d4fe5400d39c9c4cba1b865386fdd.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp"
        ]
      },
      {
        "name": "Dinh Độc Lập",
        "lat": 10.777034,
        "lng": 106.695316,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127986/admin-uploads/seeder/083a5947cd0fc6f834083de3cb3aa773f678beaf3e85f2a6260c577ce58f4a62.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp"
        ]
      },
      {
        "name": "Landmark 81",
        "lat": 10.795028,
        "lng": 106.721831,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/3938f5d3fae9234b454081fd3999ec71b9832191e574a44a3eb74e87219033d5.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp"
        ]
      }
    ]
  },
  {
    "province": "Đà Nẵng",
    "landmarks": [
      {
        "name": "Bà Nà Hills",
        "lat": 15.995056,
        "lng": 107.996919,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127988/admin-uploads/seeder/660a12666ae5efad70787c6fc6ebf7ebb82b4cb361eded84747b9ecaf7fa6f0b.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Cầu Rồng",
        "lat": 16.06118,
        "lng": 108.227018,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127998/admin-uploads/seeder/15f7775f1abd75d1fe66a38763f3d40736aba84d4ca99e153a29a4529234ddd6.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp"
        ]
      },
      {
        "name": "Bán đảo Sơn Trà",
        "lat": 16.11533,
        "lng": 108.273028,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127994/admin-uploads/seeder/c02c25fc77517ed307099e3bc977d8e78c41cafaa49f90071a459a9f375d2482.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp"
        ]
      }
    ]
  },
  {
    "province": "Quảng Ninh",
    "landmarks": [
      {
        "name": "Vịnh Hạ Long",
        "lat": 20.910052,
        "lng": 107.183903,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128016/admin-uploads/seeder/38e2a4b2b34b7e5afab91d8ef27b9e020015bd826553fa2c8639269b24a66cdb.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp"
        ]
      },
      {
        "name": "Đảo Tuần Châu",
        "lat": 20.923392,
        "lng": 106.986694,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127997/admin-uploads/seeder/690c06d572187499a1b6cc4713fc7a9f1d5748a20614cb705b62cb5deb8fd5bb.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp"
        ]
      },
      {
        "name": "Yên Tử",
        "lat": 21.151324,
        "lng": 106.724806,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128002/admin-uploads/seeder/ec87fffc768e8d589fa41decd9f93b7de69f10c6262294441436b62fcfb41766.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp"
        ]
      }
    ]
  },
  {
    "province": "Lào Cai",
    "landmarks": [
      {
        "name": "Đỉnh Fansipan",
        "lat": 22.30331,
        "lng": 103.775682,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128000/admin-uploads/seeder/65eb6c6c65c0793798ee95fa2115191f29da449e45b77349d6fa9ac3a94b7527.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp"
        ]
      },
      {
        "name": "Bản Cát Cát",
        "lat": 22.32932,
        "lng": 103.822247,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128002/admin-uploads/seeder/87375d697989b7d9595f2c4d8829fab0ea421440b768b650ca65d7302faaed17.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp"
        ]
      },
      {
        "name": "Nhà thờ đá Sapa",
        "lat": 22.335178,
        "lng": 103.842211,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128006/admin-uploads/seeder/24d68f06d504a9dcdfa16f2eccf8f9e22c3610142a47b7704c88b4cf6a2b1294.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp"
        ]
      }
    ]
  },
  {
    "province": "Khánh Hòa",
    "landmarks": [
      {
        "name": "VinWonders Nha Trang",
        "lat": 12.21635,
        "lng": 109.241655,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128008/admin-uploads/seeder/a32c478599dac4e5225435cf784c70b930006168ff2524e5fad04fd9619b381a.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp"
        ]
      },
      {
        "name": "Tháp Bà Ponagar",
        "lat": 12.265384,
        "lng": 109.195628,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128011/admin-uploads/seeder/3321e537d9af87917ac4e5ac14ef17775c42ed2c66234f5d6ad94aef35f26611.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp"
        ]
      },
      {
        "name": "Hòn Mun",
        "lat": 12.168193,
        "lng": 109.309773,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128037/admin-uploads/seeder/762836385b33b46babcf56b152723490e0d4479ad850b360f6072c4d61d9db9f.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp"
        ]
      }
    ]
  },
  {
    "province": "Lâm Đồng",
    "landmarks": [
      {
        "name": "Hồ Tuyền Lâm",
        "lat": 11.896667,
        "lng": 108.433333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128012/admin-uploads/seeder/9559fbe2f61c7225733047ff10c09ca745ba35f00bdc5c7f41610ecd2237d6eb.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp"
        ]
      },
      {
        "name": "Thung Lũng Tình Yêu",
        "lat": 11.979603,
        "lng": 108.448557,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128019/admin-uploads/seeder/0df9aad0b239a0a3c4c5c8b5daec5ebd8ce7ae09966805cf6ec87a70c9a2aa6b.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp"
        ]
      },
      {
        "name": "Langbiang",
        "lat": 12.046111,
        "lng": 108.428611,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128024/admin-uploads/seeder/b6de49321da24eff58c099893df6433e605426a6823b6c7c35b77e898f683401.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp"
        ]
      }
    ]
  },
  {
    "province": "Thừa Thiên Huế",
    "landmarks": [
      {
        "name": "Đại Nội Huế",
        "lat": 16.469336,
        "lng": 107.577947,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128024/admin-uploads/seeder/874ae7c0e45a8acc6ec9673ac11b6f66078e3667dc7e1a1a0e5de5f239d5f80d.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Lăng Tự Đức",
        "lat": 16.432841,
        "lng": 107.565676,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128028/admin-uploads/seeder/555cbe262b36dea84905c0d025bc0a4807d82fb82430a37c38769b3dc95de509.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Chùa Thiên Mụ",
        "lat": 16.453923,
        "lng": 107.545971,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128032/admin-uploads/seeder/6ee9886a6369dfefc52cf62644407c744dcd5d55716ba61118499b5815195d93.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Quảng Nam",
    "landmarks": [
      {
        "name": "Phố cổ Hội An",
        "lat": 15.880058,
        "lng": 108.338047,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128030/admin-uploads/seeder/1e70bcfe027f9753a8ba674d6af4ea947b8a561baf6851067d9a5cde901c7caf.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Cù Lao Chàm",
        "lat": 15.953709,
        "lng": 108.506752,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128040/admin-uploads/seeder/d594ae2a18560cfc7a6a6b9f21885d6045abe86a1962a0e89046499a8c0ba9dd.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp"
        ]
      },
      {
        "name": "Thánh địa Mỹ Sơn",
        "lat": 15.764996,
        "lng": 108.122305,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128048/admin-uploads/seeder/cf505900f0ede71f5ff8bc2a9aba65bf87f914101def19f3c412ce8b11a4ca8f.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127876/admin-uploads/seeder/fbe807f32c80fc031876cab4744a08cfc96bf69c0a3c0037d18a332d6765015d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Kiên Giang",
    "landmarks": [
      {
        "name": "VinWonders Phú Quốc",
        "lat": 10.33784,
        "lng": 103.853291,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128051/admin-uploads/seeder/346b19b90124348ede5a30cc63d1e71fcb5e26ee2d9f9565210570a6ed3c1839.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp"
        ]
      },
      {
        "name": "Bãi Sao Phú Quốc",
        "lat": 10.058596,
        "lng": 104.03565,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128065/admin-uploads/seeder/d7151d6c154176e6e750b9beee49d53bf17ff4cde72772350487e90ed10edded.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp"
        ]
      },
      {
        "name": "Grand World Phú Quốc",
        "lat": 10.327509,
        "lng": 103.862151,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128055/admin-uploads/seeder/9781693eb5862df59d58b3a2060bbd35fb75d432ee7cfad77680e2f535982e1c.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp"
        ]
      }
    ]
  },
  {
    "province": "Hà Giang",
    "landmarks": [
      {
        "name": "Cao nguyên đá Đồng Văn",
        "lat": 23.275367,
        "lng": 105.360194,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128064/admin-uploads/seeder/276bbac54661d34b16d537e1160d3bdb885617661c31fcba4ff3b6149b51bbd6.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp"
        ]
      },
      {
        "name": "Đèo Mã Pí Lèng",
        "lat": 23.193333,
        "lng": 105.271111,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128112/admin-uploads/seeder/87e96fc83ea904035e43bd2d13084637fdd7f6fa122019cb7d9170d8e0f73b59.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp"
        ]
      },
      {
        "name": "Núi Đôi Quản Bạ",
        "lat": 23.164444,
        "lng": 105.028611,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128067/admin-uploads/seeder/e48b8fed1971cf3182bfcfe5f804c97aec3c80b86d4af381f2370044df0e82bf.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp"
        ]
      }
    ]
  },
  {
    "province": "Ninh Bình",
    "landmarks": [
      {
        "name": "Tràng An",
        "lat": 20.238333,
        "lng": 105.9,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128068/admin-uploads/seeder/b0ec32acfd389faab8be0ac25130ebc9fad03f8afe271d3e8b8b92efbbdb83e6.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Bái Đính",
        "lat": 20.303333,
        "lng": 105.886944,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128072/admin-uploads/seeder/588791981a352910f62bd16758258db254161b8c8a6ae58ab6178571760de13d.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp"
        ]
      },
      {
        "name": "Tam Cốc - Bích Động",
        "lat": 20.218889,
        "lng": 105.898611,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128068/admin-uploads/seeder/b0ec32acfd389faab8be0ac25130ebc9fad03f8afe271d3e8b8b92efbbdb83e6.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Phú Thọ",
    "landmarks": [
      {
        "name": "Đền Hùng",
        "lat": 21.42,
        "lng": 105.32,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128073/admin-uploads/seeder/20b9bd06603fbd4798f0a9c9b078937792d67c9f93b70ca3cb057b3a41fec56f.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp"
        ]
      },
      {
        "name": "Vườn quốc gia Xuân Sơn",
        "lat": 21.35,
        "lng": 104.9,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/bb57c4556cd946a4f2e3eb1b28e26db0da636e4de661a736321d28fd1a9dd419.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Quảng Bình",
    "landmarks": [
      {
        "name": "Động Phong Nha",
        "lat": 17.571389,
        "lng": 106.285556,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128082/admin-uploads/seeder/f5e3b0449398cf395edaa853ae0a1b7de39ff6886951ee4bd3fbb332af83edc0.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp"
        ]
      },
      {
        "name": "Hang Sơn Đoòng",
        "lat": 17.455,
        "lng": 106.288333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128084/admin-uploads/seeder/713e7dacef4f2ab0c7f065886d17f4c10d506baec61fc8fc4f9ecb084dadfe9a.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp"
        ]
      },
      {
        "name": "Suối Moọc",
        "lat": 17.538889,
        "lng": 106.275,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Bình Định",
    "landmarks": [
      {
        "name": "Ghềnh Ráng Tiên Sa",
        "lat": 13.723056,
        "lng": 109.245833,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128156/admin-uploads/seeder/a3e47a1876d7b061fef8223992b0000f7a246630964b32c96ea6142f2382e821.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp"
        ]
      },
      {
        "name": "Eo Gió",
        "lat": 13.91,
        "lng": 109.31,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128088/admin-uploads/seeder/d27a1ca63d0865fcf0334ebc578fb2df11c73b441acc26ec37e21a11956735ba.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp"
        ]
      },
      {
        "name": "Kỳ Co",
        "lat": 13.889722,
        "lng": 109.279722,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128090/admin-uploads/seeder/7def2bf964c5f25e45cbfd5f901527e66736aed6d92258b0beaaf3e284f42bef.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp"
        ]
      }
    ]
  },
  {
    "province": "Phú Yên",
    "landmarks": [
      {
        "name": "Gành Đá Đĩa",
        "lat": 13.614167,
        "lng": 109.357778,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128097/admin-uploads/seeder/81d0f76a7c8e1ecb0ec0c0e761a233db8c62ca1e1ec66f7bd215605112385899.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp"
        ]
      },
      {
        "name": "Vũng Rô",
        "lat": 12.896944,
        "lng": 109.428333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128095/admin-uploads/seeder/74a27fad61847d564e6dde11ebfdffd974ea30a0b499396c88a04dd8dfeadb10.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp"
        ]
      }
    ]
  },
  {
    "province": "Bình Thuận",
    "landmarks": [
      {
        "name": "Đồi Cát Bay Mũi Né",
        "lat": 11.125,
        "lng": 108.270833,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128102/admin-uploads/seeder/2931eb18e4c1572388ce1f6003b817dd9c96b7ba58e1b4dbacefdc99c0bc1299.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp"
        ]
      },
      {
        "name": "Hòn Rơm",
        "lat": 10.896944,
        "lng": 108.3,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128104/admin-uploads/seeder/55998f6b5dac6a7681d0618e866a81e1af9fdab49e5f3d0f3bd8710f458ad2ac.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp"
        ]
      },
      {
        "name": "Bàu Trắng",
        "lat": 11.26,
        "lng": 108.4,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128108/admin-uploads/seeder/26a63e36e8b8c08e35d6cf53b950dc735dad6cfc3838bb85dfcb7f1bee420f11.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp"
        ]
      }
    ]
  },
  {
    "province": "Vũng Tàu",
    "landmarks": [
      {
        "name": "Tượng Chúa Kitô Vua",
        "lat": 10.337778,
        "lng": 107.1,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128115/admin-uploads/seeder/e2eed9b9ad5113a6ffbb6c79d755d0c6a083330c2c7e57eb0783c8a31db0c2b8.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp"
        ]
      },
      {
        "name": "Bãi Sau Vũng Tàu",
        "lat": 10.350833,
        "lng": 107.098889,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128120/admin-uploads/seeder/d2569fd2802d759fcd78d6e784d5db353da0e0e996a685a25e4939c3d966b2c4.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp"
        ]
      }
    ]
  },
  {
    "province": "Cần Thơ",
    "landmarks": [
      {
        "name": "Chợ Nổi Cái Răng",
        "lat": 10.013056,
        "lng": 105.761944,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128123/admin-uploads/seeder/cf86386c407410dc4d50bd93db85a2216e7f7287bb7112c305d93bf7dbb23f8c.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp"
        ]
      },
      {
        "name": "Vườn du lịch Mỹ Khánh",
        "lat": 10.056944,
        "lng": 105.72,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128129/admin-uploads/seeder/7e35892a143551abba0b245ca8ab010bdd621a08eca64fcc6e5c3f755ed03c50.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp"
        ]
      }
    ]
  },
  {
    "province": "Tiền Giang",
    "landmarks": [
      {
        "name": "Cồn Thới Sơn",
        "lat": 10.345,
        "lng": 106.352,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128133/admin-uploads/seeder/d5a4ddc05cdc822d3ab9ec50d5ffe104e38a79fb62e76135b2a686915b2f16db.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp"
        ]
      },
      {
        "name": "Cù Lao Ngũ Hiệp",
        "lat": 10.383,
        "lng": 106.325,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp"
        ]
      }
    ]
  },
  {
    "province": "Bến Tre",
    "landmarks": [
      {
        "name": "Cồn Phụng (Đảo Dừa)",
        "lat": 10.264167,
        "lng": 106.338889,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128137/admin-uploads/seeder/919ce0914e3da5ac28086519636598c6702a584b79ba4053a204ca9b7c990f0a.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp"
        ]
      },
      {
        "name": "Vườn dừa Bến Tre",
        "lat": 10.2416,
        "lng": 106.3753,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128145/admin-uploads/seeder/e820bf5e6e5c507242adef170dfd4e609900341d01e3b106f382ddbd5080eaa1.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp"
        ]
      }
    ]
  },
  {
    "province": "Nghệ An",
    "landmarks": [
      {
        "name": "Bãi Biển Cửa Lò",
        "lat": 18.8,
        "lng": 105.72,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128147/admin-uploads/seeder/02d3fbe645770ce2c980c72641b10aa37478141eac45ce1387284b3d1d2cbeb3.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp"
        ]
      },
      {
        "name": "Vườn quốc gia Pù Mát",
        "lat": 19.0667,
        "lng": 104.5,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128141/admin-uploads/seeder/e382bb2bde3c94961de8fbf2a992cf7c2abbb983a2c8a1802ce9c6a92ed8d1f9.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp"
        ]
      }
    ]
  },
  {
    "province": "Thanh Hóa",
    "landmarks": [
      {
        "name": "Biển Sầm Sơn",
        "lat": 19.74,
        "lng": 105.89,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128160/admin-uploads/seeder/276db0e5654ded75d024b9310e6920394fc967f0eea55ab2013cf452097461d4.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp"
        ]
      },
      {
        "name": "Thác Mây - Pù Luông",
        "lat": 20.449167,
        "lng": 105.135556,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127923/admin-uploads/seeder/984d9513f167dde469708362d58e993c9e76235c259da493ed3d4244da5a8d67.webp"
        ]
      }
    ]
  },
  {
    "province": "Hải Phòng",
    "landmarks": [
      {
        "name": "Đảo Cát Bà",
        "lat": 20.731667,
        "lng": 107.047222,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128154/admin-uploads/seeder/29bb0a9bddc240a3d068b6267fb4b2e0e0a5c304c10840e85e8106a4e21d355f.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127870/admin-uploads/seeder/0bc60f61d2fe7f8408ecb596ae92dc2c2a1aa1e87e603ab4702090c3e3c3509d.webp"
        ]
      },
      {
        "name": "Vịnh Lan Hạ",
        "lat": 20.8,
        "lng": 107.15,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128159/admin-uploads/seeder/c0a1a5be60a589d9ddfc674bdcfebea11491527c4c7d4228c47ff92249392af8.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127874/admin-uploads/seeder/912d688575354ad1438ffdccaaa240a87fbf5947fd499d5f83582345d46cc738.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127888/admin-uploads/seeder/7220d56fa6fbe8c5c3009002cd2301cf4f92d69b0e6c6d1462daad36a9df5011.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128005/admin-uploads/seeder/1b9d41fa19aca5853523ed200eec3393512199138d27fae304d2d41c87dddc61.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127991/admin-uploads/seeder/5bb9efa0facaf64c40fe4fa52410955ee748200dc71f1ced2cf0ff4d2c418891.webp"
        ]
      }
    ]
  },
  {
    "province": "Điện Biên",
    "landmarks": [
      {
        "name": "Mường Phăng",
        "lat": 21.35,
        "lng": 103.15,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      },
      {
        "name": "Sân bay Điện Biên Phủ",
        "lat": 21.397222,
        "lng": 103.008333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128162/admin-uploads/seeder/d7b86185f898316b2c7cc3aeb822e85f0f99991c721793c00939fe68f77c52f3.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128163/admin-uploads/seeder/d289eb785e9b1b1d3573cb5f8c134229ea0ceb009f6893badec4374cdb559383.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127880/admin-uploads/seeder/9bdd4b747432176c353f4b876f96704c516e881822a19da31fa175a75cd60502.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp"
        ]
      }
    ]
  },
  {
    "province": "Sơn La",
    "landmarks": [
      {
        "name": "Hang Pa Thơm",
        "lat": 21.348333,
        "lng": 103.906667,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127883/admin-uploads/seeder/d149d2a3a599aeaed9512c35a88a2da219dca3231adaf3e8142d096b4100616c.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127884/admin-uploads/seeder/c72a1e2307668bbb23fb93b32bce3a9449d8cdb518501aa013da25f7fa8a5c57.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp"
        ]
      },
      {
        "name": "Bản Áng",
        "lat": 21.15,
        "lng": 104.083333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127887/admin-uploads/seeder/7989957e2efc721bc4028fb68836bfb9841a859c15df2b9a3f9d0712579705c0.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127922/admin-uploads/seeder/8c10a02fb0b6413b80e2440c2537bdf0a4a77c39c663785f09d85e196aa2da20.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127873/admin-uploads/seeder/dcaaca4f2cb2c0426bc432791e2013054b790cbd0dd37d9def6184cbe63b9825.webp"
        ]
      }
    ]
  },
  {
    "province": "Gia Lai",
    "landmarks": [
      {
        "name": "Biển Hồ Pleiku",
        "lat": 13.978333,
        "lng": 108.018333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128164/admin-uploads/seeder/abf33653bb8ff3e44bb064c0534fc178645a214e383c19a62d8e66274fe97125.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127915/admin-uploads/seeder/9a279c2306fb12b793eb7e66f5228c466fa90f564c9fb47835bff48d3e0472ee.webp"
        ]
      },
      {
        "name": "Thác Phú Cường",
        "lat": 13.761111,
        "lng": 108.433889,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127923/admin-uploads/seeder/984d9513f167dde469708362d58e993c9e76235c259da493ed3d4244da5a8d67.webp"
        ]
      }
    ]
  },
  {
    "province": "Đắk Lắk",
    "landmarks": [
      {
        "name": "Hồ Lắk",
        "lat": 12.36,
        "lng": 108.181667,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128165/admin-uploads/seeder/ac236fadc8cbe29a9dbc94fe40d3c6bb3da496ee209ea033b89ef8bb6e7979a1.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp"
        ]
      },
      {
        "name": "Buôn Đôn",
        "lat": 12.888611,
        "lng": 107.836944,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128168/admin-uploads/seeder/2f2afea3f19397f6f3ddc41272747f6674b71a25dd6a17cd733d28936433bc05.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127899/admin-uploads/seeder/db0399228ae23b2a7891392c5810d9c09c54f95c226629ab2683abc2187ef684.webp"
        ]
      }
    ]
  },
  {
    "province": "Kon Tum",
    "landmarks": [
      {
        "name": "Măng Đen",
        "lat": 14.684167,
        "lng": 108.148333,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128169/admin-uploads/seeder/7f82f3b651914eb1f6cb777de6a0bd717f2ddc086cdb4497c78362c7a8eb33d6.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127896/admin-uploads/seeder/292e47845a21581a8f21ead3a7c30ddd859fbeb10c747b3406376b5c59563a72.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127893/admin-uploads/seeder/f546d17ee0cdd6d7a00d22d045ff9a8b3cd2fa27fb4460ef2987de25382fa643.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127910/admin-uploads/seeder/031c3dec064a4481af0ee148b2a5923f59ee0319196b702808491a08ff5c7667.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127908/admin-uploads/seeder/bddfe7260a7394003141892d8f22c6dc2fe3d4262a5399e83bd5d3458f796f7d.webp"
        ]
      },
      {
        "name": "Thác Đắk Ke",
        "lat": 14.715,
        "lng": 108.202,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128077/admin-uploads/seeder/75001879914715c09942dc9be40f336e738251a717644cbae7062ce593ce8cc7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127923/admin-uploads/seeder/984d9513f167dde469708362d58e993c9e76235c259da493ed3d4244da5a8d67.webp"
        ]
      }
    ]
  },
  {
    "province": "Bình Dương",
    "landmarks": [
      {
        "name": "Đại Nam Văn Hiến",
        "lat": 11.012222,
        "lng": 106.619722,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791128174/admin-uploads/seeder/f97877a76a9cb7c24d20bfebd39b0bc28bf7c9efb6f8f3ecbf75c7428a4da1d3.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127913/admin-uploads/seeder/ec963c84d472c76dcddd9eccbec6d6393151681201bd8d7e46a1fb3515d22540.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp"
        ]
      },
      {
        "name": "Khu Công viên Văn hóa Đồng Xanh",
        "lat": 11.025,
        "lng": 106.65,
        "thumbnail": "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127872/admin-uploads/seeder/7424efbc3fb2505ef2e972092d0d6274d6c3673c21d10245bab4c5a46a67c9d7.webp",
        "gallery": [
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127974/admin-uploads/seeder/d25f854ea3f37b9120abf586b5b7dea539d9fbafe212ee2995efbe728153d089.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127919/admin-uploads/seeder/86db07cdb79b80791d10a21e417dd5d87edd884321bb836db88de024fe6bfbf4.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127977/admin-uploads/seeder/a0b220909e3eca69c28a400520a1cc446d1def0fbe8dde74d9ae14c122b41af5.webp",
          "https://res.cloudinary.com/p1kxfhlw/image/upload/v1791127960/admin-uploads/seeder/d6211c551afaf97e8b396ba1d41451080e82cd52b65b650e071124effeffb5ae.webp"
        ]
      }
    ]
  }
];;;;;;;

const LISTING_TITLES = {
  STAY: [
    'Căn hộ dịch vụ tiện nghi gần',
    'Homestay gỗ ấm cúng view siêu đẹp sát',
    'Khách sạn cao cấp view đắt giá gần',
    'Biệt thự nghỉ dưỡng sang chảnh gần',
    'Studio hiện đại tràn ngập ánh sáng tại',
    'Phòng ngủ ấm cúng trung tâm cạnh',
    'Bungalow lãng mạn yên tĩnh gần',
    'Penthouse sang trọng view trọn cảnh',
    'Căn hộ dịch vụ cao cấp kế bên',
    'Nhà nguyên căn đầy đủ tiện nghi gần'
  ],
  EXP: [
    'Tour đi bộ khám phá ẩm thực đường phố quanh',
    'Hành trình trekking ngắm bình minh tuyệt đẹp gần',
    'Khóa học làm gốm và nấu ăn truyền thống sát',
    'Tour chụp ảnh check-in cực đẹp quanh',
    'Chèo thuyền kayak và ngắm cảnh thiên nhiên tại',
    'Tour xe đạp tham quan làng nghề cổ gần',
    'Trải nghiệm văn hóa và thưởng trà cùng người bản địa ở',
    'Khám phá cuộc sống về đêm sôi động quanh'
  ],
  SVC: [
    'Dịch vụ chụp ảnh ngoại cảnh chuyên nghiệp tại',
    'Gói massage trị liệu và phục hồi sức khỏe gần',
    'Thuê hướng dẫn viên bản địa nhiệt tình tại',
    'Dịch vụ trang điểm chuyên nghiệp đi tiệc gần',
    'Giao đồ ăn đặc sản chuẩn vị tận nơi quanh',
    'Tour chụp hình bằng flycam lưu niệm tại',
    'Dịch vụ spa chăm sóc da chuyên sâu gần',
    'Thuê xe máy phượt tự lái chất lượng tốt quanh'
  ]
};

const SERVICE_TITLES_BY_SUBCATEGORY = {
  PHOTOGRAPHY: [
    'Dịch vụ chụp ảnh ngoại cảnh chuyên nghiệp tại',
    'Gói chụp hình couple và gia đình quanh',
    'Buổi chụp ảnh check-in du lịch gần',
    'Dịch vụ quay chụp flycam lưu niệm tại',
  ],
  CHEF: [
    'Đầu bếp riêng nấu món địa phương tại',
    'Bữa tối riêng do chef chuẩn bị gần',
    'Lớp nấu ăn gia đình cùng đầu bếp ở',
    'Set menu đặc sản do chef phục vụ quanh',
  ],
  MASSAGE: [
    'Gói massage trị liệu thư giãn gần',
    'Massage phục hồi sau hành trình tại',
    'Liệu trình massage body chuyên sâu quanh',
    'Dịch vụ massage tận nơi cạnh',
  ],
  PREPARED_MEALS: [
    'Giao bữa ăn đặc sản chuẩn vị quanh',
    'Combo đồ ăn địa phương giao tận nơi tại',
    'Set picnic và đồ ăn mang đi gần',
    'Bữa ăn chuẩn bị sẵn cho nhóm tại',
  ],
  TRAINING: [
    'Buổi tập yoga và phục hồi năng lượng tại',
    'Lớp fitness cá nhân cho du khách gần',
    'Khóa huấn luyện kỹ năng ngoài trời quanh',
    'Buổi hướng dẫn vận động nhẹ tại',
  ],
  MAKEUP: [
    'Dịch vụ trang điểm chuyên nghiệp tại',
    'Gói makeup đi tiệc và chụp ảnh gần',
    'Trang điểm cô dâu và sự kiện quanh',
    'Makeup artist phục vụ tận nơi tại',
  ],
  HAIR_STYLING: [
    'Dịch vụ tạo kiểu tóc chuyên nghiệp tại',
    'Gói làm tóc đi tiệc và chụp ảnh gần',
    'Hair stylist phục vụ tận nơi quanh',
    'Tạo kiểu tóc nhanh cho du khách tại',
  ],
  SPA: [
    'Dịch vụ spa chăm sóc da chuyên sâu gần',
    'Liệu trình thư giãn và chăm sóc cơ thể tại',
    'Gói spa phục hồi năng lượng quanh',
    'Chăm sóc da và body wellness tại',
  ],
  CATERING: [
    'Dịch vụ catering tiệc nhóm tại',
    'Set buffet nhỏ cho đoàn du lịch gần',
    'Tiệc ngoài trời và bàn ăn sự kiện quanh',
    'Gói phục vụ đồ ăn cho sự kiện tại',
  ],
};

const AMENITIES_LIST = [
  'Wifi tốc độ cao',
  'Điều hòa nhiệt độ',
  'Tivi truyền hình cáp',
  'Tủ lạnh mini',
  'Máy giặt & sấy',
  'Bếp nấu đầy đủ dụng cụ',
  'Chỗ đỗ xe miễn phí',
  'Hồ bơi ngoài trời',
  'Phòng Gym hiện đại',
  'Ban công thoáng mát',
  'Lò vi sóng',
  'Máy sấy tóc',
  'Đồ vệ sinh cá nhân miễn phí',
  'Máy pha cà phê',
  'Khăn tắm sạch',
  'Hệ thống tự nhận phòng (Smart Lock)'
];

// Helper to calculate slightly offset coordinates around a center point
const offsetCoord = (lat, lng, radiusKm) => {
  const angle = Math.random() * Math.PI * 2;
  const distanceKm = Math.sqrt(Math.random()) * radiusKm;
  const latOffset = (Math.cos(angle) * distanceKm) / 111; // 1 degree lat ~ 111km
  const lngOffset = (Math.sin(angle) * distanceKm) / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: Number((lat + latOffset).toFixed(6)),
    lng: Number((lng + lngOffset).toFixed(6)),
  };
};

// Pick random from array
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPrice = (min, max) => Math.round(randomInt(min, max) / 10000) * 10000;

module.exports = {
  faker,
  IMAGE_POOLS,
  LISTING_IMAGE_POOLS,
  PROVINCES_AND_LANDMARKS,
  LISTING_TITLES,
  SERVICE_TITLES_BY_SUBCATEGORY,
  AMENITIES_LIST,
  offsetCoord,
  pick,
  pickN,
  randomInt,
  randomPrice,
};
