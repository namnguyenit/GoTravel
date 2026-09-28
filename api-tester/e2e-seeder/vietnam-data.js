const faker = require('@faker-js/faker').fakerVI; // Vietnamese locale
if (!faker.internet.username) faker.internet.username = faker.internet.userName;

// Image pools carefully curated from Unsplash (expanded)
const IMAGE_POOLS = {
  STAY: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1200',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200',
    'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200',
    'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1200',
    'https://images.unsplash.com/photo-1558882224-dda166733046?w=1200',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
    'https://images.unsplash.com/photo-1527030280862-64139fba04ca?w=1200',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
  ],
  EXP: [
    'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
    'https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200',
    'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200',
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200',
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200',
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200',
    'https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200',
    'https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200',
    'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=1200',
    'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1200',
    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200',
  ],
  SVC: [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200',
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200',
    'https://images.unsplash.com/photo-1552693673-1bf958298935?w=1200',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200',
    'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=1200',
    'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=1200',
    'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200',
    'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200',
  ],
  LANDMARK: [
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200',
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200',
    'https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200',
    'https://images.unsplash.com/photo-1570366583862-f91883984fde?w=1200',
    'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200',
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
  ],
  AVATAR: [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=200',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200',
  ],
  COMPLEX: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200',
    'https://images.unsplash.com/photo-1519449556851-5720b33024e7?w=1200',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200',
    'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=1200',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200',
    'https://images.unsplash.com/photo-1549294413-26f195200c16?w=1200',
    'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=1200',
  ]
};

const LISTING_IMAGE_POOLS = {
  STAY: IMAGE_POOLS.STAY,
  EXP: IMAGE_POOLS.EXP,
  SVC: {
    PHOTOGRAPHY: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200',
      'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=1200',
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200',
      'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=1200',
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200',
    ],
    CHEF: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200',
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200',
    ],
    MASSAGE: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200',
      'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200',
    ],
    PREPARED_MEALS: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
    ],
    TRAINING: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200',
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200',
    ],
    MAKEUP: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200',
      'https://images.unsplash.com/photo-1552693673-1bf958298935?w=1200',
      'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200',
      'https://images.unsplash.com/photo-1559131397-f94da358f7ca?w=1200',
    ],
    HAIR_STYLING: [
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200',
      'https://images.unsplash.com/photo-1552693673-1bf958298935?w=1200',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200',
    ],
    SPA: [
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200',
      'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200',
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200',
    ],
    CATERING: [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200',
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Hoan_Kiem.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200"
        ]
      },
      {
        "name": "Văn Miếu Quốc Tử Giám",
        "lat": 21.028071,
        "lng": 105.835536,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/3/39/Hanoi_Temple_of_Literature_%28cropped%29.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Lăng Chủ tịch Hồ Chí Minh",
        "lat": 21.036873,
        "lng": 105.834667,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/fd/L%C4%83ng_B%C3%A1c_-_NKS.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/9/91/Ben_Thanh_market_2.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200"
        ]
      },
      {
        "name": "Dinh Độc Lập",
        "lat": 10.777034,
        "lng": 106.695316,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Dinh_%C4%90%E1%BB%99c_L%E1%BA%ADp_v%C3%A0o_n%C3%A0m_2024.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200",
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200"
        ]
      },
      {
        "name": "Landmark 81",
        "lat": 10.795028,
        "lng": 106.721831,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/4/4e/The_Landmark_81_at_night.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/2/28/Panoramic_View.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Cầu Rồng",
        "lat": 16.06118,
        "lng": 108.227018,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/1/19/Dragon_bridge_from_above.png",
        "gallery": [
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200"
        ]
      },
      {
        "name": "Bán đảo Sơn Trà",
        "lat": 16.11533,
        "lng": 108.273028,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/8/8d/Ban_dao_Son_Tra.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/2/29/V%E1%BB%8Bnh_H%E1%BA%A1_Long_-_NKS.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200"
        ]
      },
      {
        "name": "Đảo Tuần Châu",
        "lat": 20.923392,
        "lng": 106.986694,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/3/3c/Tu%E1%BA%A7n_Ch%C3%A2u.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200"
        ]
      },
      {
        "name": "Yên Tử",
        "lat": 21.151324,
        "lng": 106.724806,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/3/31/N%C3%BAi_Y%C3%AAn_T%E1%BB%AD.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/de/C%C3%A1p-treo-fansipan-17.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200"
        ]
      },
      {
        "name": "Bản Cát Cát",
        "lat": 22.32932,
        "lng": 103.822247,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/6/66/B%E1%BA%A3n_C%C3%A1t_C%C3%A1t.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200"
        ]
      },
      {
        "name": "Nhà thờ đá Sapa",
        "lat": 22.335178,
        "lng": 103.842211,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Nh%C3%A0_th%E1%BB%9D_%C4%91%C3%A1_Sapa_-_panoramio.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/a/ad/Vinpearl_Land_Nha_Trang_Ferris_wheel.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200"
        ]
      },
      {
        "name": "Tháp Bà Ponagar",
        "lat": 12.265384,
        "lng": 109.195628,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/1/12/Th%C3%A1p_B%C3%A0_PONAGAR_-_panoramio.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200"
        ]
      },
      {
        "name": "Hòn Mun",
        "lat": 12.168193,
        "lng": 109.309773,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/5/5a/Hon_Mun_island_%28H%C3%B2n_Mun%29%2C_Cam_Ranh%2C_Nha_Trang%2C_Vi%E1%BB%87t_Nam_20140518_105634_%28taken_with_Samsung_Galaxy_Note_3%29.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/d5/Tuyen_Lam_Lake_01.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200"
        ]
      },
      {
        "name": "Thung Lũng Tình Yêu",
        "lat": 11.979603,
        "lng": 108.448557,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/c/c7/TLTY2.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200"
        ]
      },
      {
        "name": "Langbiang",
        "lat": 12.046111,
        "lng": 108.428611,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/8/84/%C4%90%E1%BB%89nh_Langbiang.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/b/b9/%C4%90%E1%BA%A1i_n%E1%BB%99i.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Lăng Tự Đức",
        "lat": 16.432841,
        "lng": 107.565676,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/dd/Annam_-_Hu%C3%A9_-_Pavillons_sur_le_bassin_fleuri_au_Tombeau_de_Tu-Duc.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Chùa Thiên Mụ",
        "lat": 16.453923,
        "lng": 107.545971,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/8/88/ThienMuPagoda.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/f3/PhoCoHoiAn.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Cù Lao Chàm",
        "lat": 15.953709,
        "lng": 108.506752,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/0/06/%C4%90%E1%BA%A3o_C%C3%B9_Lao_Ch%C3%A0m_g%C3%B3c_nh%C3%ACn_t%E1%BB%AB_Cano.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200"
        ]
      },
      {
        "name": "Thánh địa Mỹ Sơn",
        "lat": 15.764996,
        "lng": 108.122305,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/0/07/2024_-_M%E1%BB%B9_S%C6%A1n_Group_B%2C_C_and_D_-_img_23.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Vinpearl_Phu_Quoc_%2849355608416%29.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200"
        ]
      },
      {
        "name": "Bãi Sao Phú Quốc",
        "lat": 10.058596,
        "lng": 104.03565,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Phu_Quoc%2C_Viet_Nam.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200"
        ]
      },
      {
        "name": "Grand World Phú Quốc",
        "lat": 10.327509,
        "lng": 103.862151,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/df/2023-07-30_Grand_World_Ph%C3%BA_Qu%E1%BB%91c_203427.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/f5/B%C3%A3i_%C4%91%C3%A1_m%E1%BA%B7t_tr%C4%83ng_%C4%90%E1%BB%93ng_V%C4%83n_-_NKS.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200"
        ]
      },
      {
        "name": "Đèo Mã Pí Lèng",
        "lat": 23.193333,
        "lng": 105.271111,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/dc/%C4%90%C3%A8o_M%C3%A3_P%C3%AD_L%C3%A8ng_2022.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200"
        ]
      },
      {
        "name": "Núi Đôi Quản Bạ",
        "lat": 23.164444,
        "lng": 105.028611,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Quanba.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/0/08/Muaxuantamcoc.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Bái Đính",
        "lat": 20.303333,
        "lng": 105.886944,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/b/b2/Chua_Bai_Dinh_X8.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200"
        ]
      },
      {
        "name": "Tam Cốc - Bích Động",
        "lat": 20.218889,
        "lng": 105.898611,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/0/08/Muaxuantamcoc.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/f8/Mausoleum_of_Hung_King.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200"
        ]
      },
      {
        "name": "Vườn quốc gia Xuân Sơn",
        "lat": 21.35,
        "lng": 104.9,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/c/c4/Xuan_Son.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/a/a6/V%C3%A0o_%C4%91%E1%BB%99ng_Phong_Nha.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200"
        ]
      },
      {
        "name": "Hang Sơn Đoòng",
        "lat": 17.455,
        "lng": 106.288333,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/b/b4/Son_Doong_Cave_by_Daniel_Burka.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200"
        ]
      },
      {
        "name": "Suối Moọc",
        "lat": 17.538889,
        "lng": 106.275,
        "thumbnail": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/d/da/B%C3%A3i_%C4%90%C3%A1_Tr%E1%BB%A9ng.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200"
        ]
      },
      {
        "name": "Eo Gió",
        "lat": 13.91,
        "lng": 109.31,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/5/52/Eo_Gi%C3%B3_-_Nh%C6%A1n_L%C3%BD.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200"
        ]
      },
      {
        "name": "Kỳ Co",
        "lat": 13.889722,
        "lng": 109.279722,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/f5/Ky_Co_-_Nhon_Ly_-_Quy_Nhon_-_Binh_Dinh_-_Viet_Nam.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/0/00/G%C3%A0nh_%C4%90%C3%A1_%C4%90%C4%A9a_-_Ph%C3%BA_Y%C3%AAn.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200"
        ]
      },
      {
        "name": "Vũng Rô",
        "lat": 12.896944,
        "lng": 109.428333,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/6/6f/V%E1%BB%8Bnh_V%C5%A9ng_R%C3%B4.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/2/2e/Vietnam%2C_Mui_Ne_sand_dune.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200"
        ]
      },
      {
        "name": "Hòn Rơm",
        "lat": 10.896944,
        "lng": 108.3,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/ff/H%C3%B2n_R%C6%A1m.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200"
        ]
      },
      {
        "name": "Bàu Trắng",
        "lat": 11.26,
        "lng": 108.4,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/9/96/B%C3%A0u_Tr%E1%BA%AFng_%2828680306740%29.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/3/3e/Statue_of_Jesus_in_Vungtau.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200"
        ]
      },
      {
        "name": "Bãi Sau Vũng Tàu",
        "lat": 10.350833,
        "lng": 107.098889,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/ff/B%C3%A3i_sau%2C_V%C5%A9ng_T%C3%A0u%2C_02_2014.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/6/62/M%E1%BB%99t_c%E1%BA%A3nh_%E1%BB%9F_ch%E1%BB%A3_n%E1%BB%95i_C%C3%A1i_R%C4%83ng.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200"
        ]
      },
      {
        "name": "Vườn du lịch Mỹ Khánh",
        "lat": 10.056944,
        "lng": 105.72,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Khu_du_l%E1%BB%8Bch_M%E1%BB%B9_Kh%C3%A1nh.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/4/43/T%C3%A0u_du_l%E1%BB%8Bch_gh%C3%A9_c%E1%BB%93n_L%C3%A2n.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200"
        ]
      },
      {
        "name": "Cù Lao Ngũ Hiệp",
        "lat": 10.383,
        "lng": 106.325,
        "thumbnail": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/7/72/C%E1%BB%93n_Ph%E1%BB%A5ng.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200"
        ]
      },
      {
        "name": "Vườn dừa Bến Tre",
        "lat": 10.2416,
        "lng": 106.3753,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/7/79/20190924_Ben_Tre_river_boat-1.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Cua_Lo_Beach.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200"
        ]
      },
      {
        "name": "Vườn quốc gia Pù Mát",
        "lat": 19.0667,
        "lng": 104.5,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/fb/Annamite_range_pu_mat_2007_05.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/b/b8/B%C3%A3i_bi%E1%BB%83n_S%E1%BA%A7m_S%C6%A1n_2.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200"
        ]
      },
      {
        "name": "Thác Mây - Pù Luông",
        "lat": 20.449167,
        "lng": 105.135556,
        "thumbnail": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/4/4f/QD_Catba2.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200"
        ]
      },
      {
        "name": "Vịnh Lan Hạ",
        "lat": 20.8,
        "lng": 107.15,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Lan_Ha_Bay.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1200",
          "https://images.unsplash.com/photo-1543637005-4d639a4e16de?w=1200",
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
          "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200"
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
        "thumbnail": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
        ]
      },
      {
        "name": "Sân bay Điện Biên Phủ",
        "lat": 21.397222,
        "lng": 103.008333,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/7/70/Dien_Bien_Phu_Airport.JPG",
        "gallery": [
          "https://upload.wikimedia.org/wikipedia/commons/8/8f/Dien_Bien_Phu_Airport_aux1.JPG",
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200",
          "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200"
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
        "thumbnail": "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200"
        ]
      },
      {
        "name": "Bản Áng",
        "lat": 21.15,
        "lng": 104.083333,
        "thumbnail": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200",
          "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200",
          "https://images.unsplash.com/photo-1555921015-5532091f6026?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/c/c2/H%E1%BB%93_%C4%90%E1%BB%A9c_An.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200"
        ]
      },
      {
        "name": "Thác Phú Cường",
        "lat": 13.761111,
        "lng": 108.433889,
        "thumbnail": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Lak_Lake.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200"
        ]
      },
      {
        "name": "Buôn Đôn",
        "lat": 12.888611,
        "lng": 107.836944,
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Tr%C3%AAn_cao_nguy%C3%AAn_%C4%90%E1%BA%AFk_L%E1%BA%AFk.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/f/f4/Th%E1%BB%8B_tr%E1%BA%A5n_M%C4%83ng_%C4%90en.jpg",
        "gallery": [
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200",
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200",
          "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200",
          "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200"
        ]
      },
      {
        "name": "Thác Đắk Ke",
        "lat": 14.715,
        "lng": 108.202,
        "thumbnail": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200"
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
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/7/7b/%C4%90%E1%BA%A1i_Nam_c%E1%BB%95ng_ch%C3%A0o_1.JPG",
        "gallery": [
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200"
        ]
      },
      {
        "name": "Khu Công viên Văn hóa Đồng Xanh",
        "lat": 11.025,
        "lng": 106.65,
        "thumbnail": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
        "gallery": [
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200",
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
          "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200"
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
